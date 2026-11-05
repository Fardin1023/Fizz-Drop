package com.fizzdrop.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fizzdrop.dto.StripePaymentRequestDTO;
import com.fizzdrop.dto.StripePaymentResponseDTO;
import com.fizzdrop.entity.*;
import com.fizzdrop.repository.*;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.PaymentIntent;
import com.stripe.model.StripeObject;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class StripePaymentService {

    @Value("${stripe.api.key}")
    private String stripeApiKey;

    @Value("${stripe.publishable.key}")
    private String stripePublishableKey;

    @Value("${stripe.currency:bdt}")
    private String defaultCurrency;

    @Value("${stripe.webhook.secret:}")
    private String webhookSecret;

    @Autowired
    private RequisitionProcessingService requisitionService;

    @Autowired
    private SupplierProfileRepository supplierProfileRepository;

    @Autowired
    private SupplierTransactionRepository supplierTransactionRepository;

    @Autowired
    private OutletRepository outletRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ShopInventoryRepository shopInventoryRepository;

    @Autowired
    private AppNotificationRepository appNotificationRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Initializes a Stripe PaymentIntent for embedded Stripe Elements.
     */
    public StripePaymentResponseDTO createPaymentIntent(StripePaymentRequestDTO request) {
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return StripePaymentResponseDTO.failure("Payment amount must be greater than zero.");
        }

        try {
            Stripe.apiKey = this.stripeApiKey;

            String currency = (request.getCurrency() != null && !request.getCurrency().trim().isEmpty())
                    ? request.getCurrency().trim().toLowerCase()
                    : this.defaultCurrency.toLowerCase();

            // Stripe amounts are processed in the smallest currency unit (e.g. cents/poisha -> amount * 100)
            long amountInSubunits = request.getAmount()
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(0, RoundingMode.HALF_UP)
                    .longValue();

            Map<String, String> meta = new HashMap<>();
            if (request.getMetadata() != null) {
                meta.putAll(request.getMetadata());
            }
            if (request.getPaymentType() != null) meta.put("payment_type", request.getPaymentType());
            if (request.getReferenceId() != null) meta.put("reference_id", request.getReferenceId());
            if (request.getUserId() != null) meta.put("user_id", String.valueOf(request.getUserId()));
            if (request.getSupplierId() != null) meta.put("supplier_id", String.valueOf(request.getSupplierId()));
            if (request.getOutletId() != null) meta.put("outlet_id", String.valueOf(request.getOutletId()));
            if (request.getProductId() != null) meta.put("product_id", String.valueOf(request.getProductId()));
            if (request.getQuantity() != null) meta.put("quantity", String.valueOf(request.getQuantity()));

            String desc = request.getDescription() != null
                    ? request.getDescription()
                    : ("FizzDrop " + (request.getPaymentType() != null ? request.getPaymentType() : "Payment") + " - ৳" + request.getAmount());

            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount(amountInSubunits)
                    .setCurrency(currency)
                    .setDescription(desc)
                    .setAutomaticPaymentMethods(
                            PaymentIntentCreateParams.AutomaticPaymentMethods.builder().setEnabled(true).build()
                    )
                    .putAllMetadata(meta)
                    .build();

            PaymentIntent intent = PaymentIntent.create(params);

            StripePaymentResponseDTO response = StripePaymentResponseDTO.success(
                    intent.getClientSecret(),
                    intent.getId(),
                    this.stripePublishableKey,
                    request.getAmount(),
                    currency.toUpperCase(),
                    intent.getStatus()
            );

            Map<String, Object> details = new HashMap<>();
            details.put("intent_id", intent.getId());
            details.put("created", intent.getCreated());
            response.setDetails(details);

            return response;

        } catch (StripeException e) {
            System.err.println("[StripePaymentService] StripeException: " + e.getMessage());
            return StripePaymentResponseDTO.failure("Stripe Error: " + (e.getUserMessage() != null ? e.getUserMessage() : e.getMessage()));
        } catch (Exception e) {
            System.err.println("[StripePaymentService] Error: " + e.getMessage());
            return StripePaymentResponseDTO.failure("Failed to create Stripe payment intent: " + e.getMessage());
        }
    }

    /**
     * Confirms a verified Stripe payment and executes transaction fulfillment
     * across the 4 transaction scopes:
     * 1. WALLET_TOPUP (Supplier Commercial Wallet)
     * 2. CONSUMER_ORDER (Direct Outlet Retail Sale)
     * 3. STOCK_REQUISITION (Supplier Central Depot Purchase)
     * 4. OUTLET_REQUISITION (Franchise Branch Restock Invoices)
     */
    @Transactional
    public Map<String, Object> confirmAndFulfill(String paymentIntentId, String paymentType, String referenceId, Map<String, Object> payload) {
        Map<String, Object> result = new HashMap<>();
        try {
            Stripe.apiKey = this.stripeApiKey;
            PaymentIntent intent = PaymentIntent.retrieve(paymentIntentId);

            if (!"succeeded".equalsIgnoreCase(intent.getStatus())) {
                result.put("success", false);
                result.put("message", "Stripe payment has not succeeded yet (Current status: " + intent.getStatus() + ")");
                return result;
            }

            BigDecimal paidAmount = BigDecimal.valueOf(intent.getAmount())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            String resolvedType = paymentType != null ? paymentType.toUpperCase() : intent.getMetadata().getOrDefault("payment_type", "UNKNOWN").toUpperCase();

            switch (resolvedType) {
                case "WALLET_TOPUP": {
                    Long userId = null;
                    if (payload != null && payload.get("user_id") != null) {
                        userId = Long.parseLong(payload.get("user_id").toString());
                    } else if (intent.getMetadata().get("user_id") != null) {
                        userId = Long.parseLong(intent.getMetadata().get("user_id"));
                    } else {
                        userId = 4L; // Default supplier userId fallback
                    }

                    Long supplierId = null;
                    if (payload != null && payload.get("supplier_id") != null) {
                        supplierId = Long.parseLong(payload.get("supplier_id").toString());
                    } else if (intent.getMetadata().get("supplier_id") != null) {
                        supplierId = Long.parseLong(intent.getMetadata().get("supplier_id"));
                    }

                    Map<String, Object> topupPayload = new HashMap<>();
                    topupPayload.put("amount", paidAmount);
                    topupPayload.put("payment_method", "STRIPE_CARD");
                    topupPayload.put("reference_code", intent.getId());
                    topupPayload.put("notes", "Instant Commercial Wallet deposit settled via Stripe Card (" + intent.getId() + ")");

                    Map<String, Object> topupResult = requisitionService.topupSupplierWallet(userId, supplierId, topupPayload);
                    result.putAll(topupResult);
                    result.put("payment_method", "STRIPE_CARD");
                    result.put("payment_intent_id", intent.getId());
                    break;
                }

                case "CONSUMER_ORDER": {
                    Long outletId = Long.parseLong(intent.getMetadata().getOrDefault("outlet_id", payload != null && payload.get("outlet_id") != null ? payload.get("outlet_id").toString() : "2"));
                    Long productId = Long.parseLong(intent.getMetadata().getOrDefault("product_id", payload != null && payload.get("product_id") != null ? payload.get("product_id").toString() : "21"));
                    int qty = Integer.parseInt(intent.getMetadata().getOrDefault("quantity", payload != null && payload.get("quantity") != null ? payload.get("quantity").toString() : "1"));

                    // Deduct shelf stock
                    var invOpt = shopInventoryRepository.findByBranchIdAndProductId(outletId, productId);
                    if (invOpt.isPresent()) {
                        ShopInventory inv = invOpt.get();
                        inv.setStockQuantity(Math.max(0, inv.getStockQuantity() - qty));
                        inv.setUpdatedDate(LocalDateTime.now());
                        shopInventoryRepository.save(inv);
                    }

                    String saleCode = "SL-STRIPE-" + System.currentTimeMillis();
                    String prodName = productRepository.findById(productId).map(p -> p.getBrand() + " " + p.getFlavorVariant()).orElse("Beverage Product");
                    BigDecimal unitPrice = paidAmount.divide(BigDecimal.valueOf(qty), 2, RoundingMode.HALF_UP);

                    try {
                        jdbcTemplate.update(
                                "INSERT INTO outlet_sales (sale_code, outlet_id, product_id, product_name, quantity, unit_price, total_amount, payment_method, customer_notes, sale_date) " +
                                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                                saleCode, outletId, productId, prodName, qty, unitPrice, paidAmount, "STRIPE_CARD", "Paid online via Stripe (" + intent.getId() + ")"
                        );
                    } catch (Exception ex) {
                        System.err.println("[StripePaymentService] outlet_sales insert warning: " + ex.getMessage());
                    }

                    result.put("success", true);
                    result.put("sale_code", saleCode);
                    result.put("amount", paidAmount);
                    result.put("message", "Order successfully paid with Stripe! Receipt generated.");
                    result.put("payment_intent_id", intent.getId());
                    break;
                }

                case "STOCK_REQUISITION": {
                    Long reqId = referenceId != null ? Long.parseLong(referenceId) : null;
                    if (reqId == null && intent.getMetadata().get("requisition_id") != null) {
                        reqId = Long.parseLong(intent.getMetadata().get("requisition_id"));
                    }

                    if (reqId != null) {
                        // Mark stock requisition as paid and record transaction
                        jdbcTemplate.update(
                                "UPDATE stock_requisitions SET payment_status = 'PAID', paid_amount = total_amount, balance_due = 0, payment_method = 'STRIPE_CARD', updated_at = NOW() WHERE id = ?",
                                reqId
                        );

                        Long supplierId = Long.parseLong(intent.getMetadata().getOrDefault("supplier_id", "1"));
                        SupplierTransaction tx = new SupplierTransaction(
                                "TXN-STRIPE-" + System.currentTimeMillis(),
                                supplierId,
                                reqId,
                                null,
                                intent.getId(),
                                "STOCK_PURCHASE",
                                "DEBIT",
                                paidAmount,
                                "STRIPE_CARD",
                                "Stock requisition purchase settled via Stripe Card (" + intent.getId() + ")",
                                "COMPLETED"
                        );
                        supplierTransactionRepository.save(tx);

                        result.put("success", true);
                        result.put("requisition_id", reqId);
                        result.put("message", "Stock requisition payment successfully settled via Stripe!");
                    } else {
                        result.put("success", true);
                        result.put("message", "Stripe payment captured for stock purchase.");
                    }
                    result.put("payment_intent_id", intent.getId());
                    break;
                }

                case "OUTLET_REQUISITION": {
                    Long outReqId = referenceId != null ? Long.parseLong(referenceId) : null;
                    if (outReqId == null && intent.getMetadata().get("outlet_requisition_id") != null) {
                        outReqId = Long.parseLong(intent.getMetadata().get("outlet_requisition_id"));
                    }

                    if (outReqId != null) {
                        jdbcTemplate.update(
                                "UPDATE outlet_requisitions SET status = 'DISPATCHED', admin_supplier_notes = CONCAT(COALESCE(admin_supplier_notes, ''), ' | Paid via Stripe: " + intent.getId() + "'), updated_date = NOW() WHERE id = ?",
                                outReqId
                        );
                        result.put("success", true);
                        result.put("outlet_requisition_id", outReqId);
                        result.put("message", "Outlet restock requisition payment received via Stripe and marked as dispatched!");
                    } else {
                        result.put("success", true);
                        result.put("message", "Outlet invoice settled via Stripe.");
                    }
                    result.put("payment_intent_id", intent.getId());
                    break;
                }

                default: {
                    result.put("success", true);
                    result.put("message", "Stripe payment of ৳" + paidAmount + " verified successfully!");
                    result.put("payment_intent_id", intent.getId());
                    break;
                }
            }

            return result;

        } catch (Exception e) {
            System.err.println("[StripePaymentService] confirmAndFulfill Error: " + e.getMessage());
            result.put("success", false);
            result.put("message", "Fulfillment error: " + e.getMessage());
            return result;
        }
    }

    /**
     * Handles webhook callbacks from Stripe
     */
    public boolean processWebhook(String payload, String sigHeader) {
        try {
            if (webhookSecret != null && !webhookSecret.trim().isEmpty() && sigHeader != null) {
                Event event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
                if ("payment_intent.succeeded".equals(event.getType())) {
                    EventDataObjectDeserializer dataObjectDeserializer = event.getDataObjectDeserializer();
                    StripeObject stripeObject = dataObjectDeserializer.getObject().orElse(null);
                    if (stripeObject instanceof PaymentIntent intent) {
                        confirmAndFulfill(intent.getId(), intent.getMetadata().get("payment_type"), intent.getMetadata().get("reference_id"), Collections.emptyMap());
                    }
                }
            } else {
                // If webhook secret not configured yet, parse raw JSON payload
                JsonNode root = objectMapper.readTree(payload);
                String type = root.path("type").asText();
                if ("payment_intent.succeeded".equals(type)) {
                    String piId = root.path("data").path("object").path("id").asText();
                    String pType = root.path("data").path("object").path("metadata").path("payment_type").asText();
                    String refId = root.path("data").path("object").path("metadata").path("reference_id").asText();
                    if (!piId.isEmpty()) {
                        confirmAndFulfill(piId, pType, refId, Collections.emptyMap());
                    }
                }
            }
            return true;
        } catch (Exception e) {
            System.err.println("[StripePaymentService] Webhook processing exception: " + e.getMessage());
            return false;
        }
    }
}
