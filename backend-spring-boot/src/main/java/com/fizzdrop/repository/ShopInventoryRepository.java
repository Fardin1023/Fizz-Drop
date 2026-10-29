package com.fizzdrop.repository;

import com.fizzdrop.entity.ShopInventory;
import com.fizzdrop.entity.ShopInventoryId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShopInventoryRepository extends JpaRepository<ShopInventory, ShopInventoryId> {

    List<ShopInventory> findByBranchId(Long branchId);

    List<ShopInventory> findByProductId(Long productId);

    Optional<ShopInventory> findByBranchIdAndProductId(Long branchId, Long productId);

    @Query("SELECT SUM(s.stockQuantity) FROM ShopInventory s WHERE s.productId = :productId")
    Integer getTotalStockByProductId(@Param("productId") Long productId);
}
