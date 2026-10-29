package com.fizzdrop.entity;

import java.io.Serializable;
import java.util.Objects;

public class ShopInventoryId implements Serializable {
    private Long branchId;
    private Long productId;

    public ShopInventoryId() {}

    public ShopInventoryId(Long branchId, Long productId) {
        this.branchId = branchId;
        this.productId = productId;
    }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ShopInventoryId that)) return false;
        return Objects.equals(branchId, that.branchId) && Objects.equals(productId, that.productId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(branchId, productId);
    }
}
