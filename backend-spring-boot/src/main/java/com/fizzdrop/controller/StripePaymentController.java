package com.fizzdrop.controller;

import com.fizzdrop.dto.ApiResponse;
import com.fizzdrop.dto.StripePaymentRequestDTO;
import com.fizzdrop.dto.StripePaymentResponseDTO;
import com.fizzdrop.service.StripePaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/payments/stripe")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class StripePaymentController {

    @Autowired
    private StripePaymentService stripePaymentService;

    @Value("${stripe.publishable.key}")
    private String publishableKey;

    @Value("${stripe.currency:bdt}")
    private String defaultCurrency;

    /**
     * Get Stripe configuration status & publishable key for client
     */
    @GetMapping("/config")
    public ResponseEntity<?> getStripeConfig() {
        return ResponseEntity.ok(Map.of(
                "publishable_key", publishableKey,
                "currency", defaultCurrency.toUpperCase(),
                "enabled", true
        ));
    }

    /**
     * Create Payment Intent for embedded Stripe Elements
     */
    @PostMapping("/create-payment-intent")
    public ResponseEntity<StripePaymentResponseDTO> createPaymentIntent(@RequestBody StripePaymentRequestDTO request) {
        StripePaymentResponseDTO response = stripePaymentService.createPaymentIntent(request);
        if (!response.isSuccess()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
        return ResponseEntity.ok(response);
    }

    /**
     * Confirm payment intent and fulfill business action (Wallet topup, customer order, stock requisition, outlet restock)
     */
    @PostMapping("/confirm")
    public ResponseEntity<?> confirmPayment(@RequestBody Map<String, Object> body) {
        if (!body.containsKey("payment_intent_id") || body.get("payment_intent_id") == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("payment_intent_id is required."));
        }

        String paymentIntentId = body.get("payment_intent_id").toString();
        String paymentType = body.get("payment_type") != null ? body.get("payment_type").toString() : null;
        String referenceId = body.get("reference_id") != null ? body.get("reference_id").toString() : null;

        Map<String, Object> fulfillment = stripePaymentService.confirmAndFulfill(paymentIntentId, paymentType, referenceId, body);
        if (Boolean.TRUE.equals(fulfillment.get("success"))) {
            return ResponseEntity.ok(fulfillment);
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(fulfillment);
        }
    }

    /**
     * Stripe Webhook Endpoint for background event notifications
     */
    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String sigHeader) {
        boolean processed = stripePaymentService.processWebhook(payload, sigHeader);
        if (processed) {
            return ResponseEntity.ok("Webhook received and processed");
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Webhook processing failed");
        }
    }
}
