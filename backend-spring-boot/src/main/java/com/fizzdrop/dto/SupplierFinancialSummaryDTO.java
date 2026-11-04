package com.fizzdrop.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fizzdrop.entity.SupplierTransaction;
import java.math.BigDecimal;
import java.util.List;

public class SupplierFinancialSummaryDTO {

    @JsonProperty("total_spent")
    private BigDecimal totalSpent = BigDecimal.ZERO;

    @JsonProperty("total_refunded")
    private BigDecimal totalRefunded = BigDecimal.ZERO;

    @JsonProperty("net_investment")
    private BigDecimal netInvestment = BigDecimal.ZERO;

    @JsonProperty("total_revenue")
    private BigDecimal totalRevenue = BigDecimal.ZERO;

    @JsonProperty("total_wholesale_profit")
    private BigDecimal totalWholesaleProfit = BigDecimal.ZERO;

    @JsonProperty("wallet_balance")
    private BigDecimal walletBalance = BigDecimal.ZERO;

    @JsonProperty("pending_returns_count")
    private long pendingReturnsCount = 0;

    @JsonProperty("pending_returns_value")
    private BigDecimal pendingReturnsValue = BigDecimal.ZERO;

    @JsonProperty("transactions")
    private List<SupplierTransaction> transactions;

    public SupplierFinancialSummaryDTO() {}

    public SupplierFinancialSummaryDTO(BigDecimal totalSpent, BigDecimal totalRefunded, BigDecimal netInvestment, long pendingReturnsCount, BigDecimal pendingReturnsValue, List<SupplierTransaction> transactions) {
        this.totalSpent = totalSpent;
        this.totalRefunded = totalRefunded;
        this.netInvestment = netInvestment;
        this.pendingReturnsCount = pendingReturnsCount;
        this.pendingReturnsValue = pendingReturnsValue;
        this.transactions = transactions;
    }

    public SupplierFinancialSummaryDTO(BigDecimal totalSpent, BigDecimal totalRefunded, BigDecimal netInvestment, BigDecimal totalRevenue, BigDecimal totalWholesaleProfit, long pendingReturnsCount, BigDecimal pendingReturnsValue, List<SupplierTransaction> transactions) {
        this.totalSpent = totalSpent;
        this.totalRefunded = totalRefunded;
        this.netInvestment = netInvestment;
        this.totalRevenue = totalRevenue;
        this.totalWholesaleProfit = totalWholesaleProfit;
        this.pendingReturnsCount = pendingReturnsCount;
        this.pendingReturnsValue = pendingReturnsValue;
        this.transactions = transactions;
    }

    public BigDecimal getTotalSpent() { return totalSpent; }
    public void setTotalSpent(BigDecimal totalSpent) { this.totalSpent = totalSpent; }

    public BigDecimal getTotalRefunded() { return totalRefunded; }
    public void setTotalRefunded(BigDecimal totalRefunded) { this.totalRefunded = totalRefunded; }

    public BigDecimal getNetInvestment() { return netInvestment; }
    public void setNetInvestment(BigDecimal netInvestment) { this.netInvestment = netInvestment; }

    public BigDecimal getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(BigDecimal totalRevenue) { this.totalRevenue = totalRevenue; }

    public BigDecimal getTotalWholesaleProfit() { return totalWholesaleProfit; }
    public void setTotalWholesaleProfit(BigDecimal totalWholesaleProfit) { this.totalWholesaleProfit = totalWholesaleProfit; }

    public BigDecimal getWalletBalance() { return walletBalance; }
    public void setWalletBalance(BigDecimal walletBalance) { this.walletBalance = walletBalance; }

    public long getPendingReturnsCount() { return pendingReturnsCount; }
    public void setPendingReturnsCount(long pendingReturnsCount) { this.pendingReturnsCount = pendingReturnsCount; }

    public BigDecimal getPendingReturnsValue() { return pendingReturnsValue; }
    public void setPendingReturnsValue(BigDecimal pendingReturnsValue) { this.pendingReturnsValue = pendingReturnsValue; }

    public List<SupplierTransaction> getTransactions() { return transactions; }
    public void setTransactions(List<SupplierTransaction> transactions) { this.transactions = transactions; }
}
