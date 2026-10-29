package com.fizzdrop.repository;

import com.fizzdrop.entity.StockRequisitionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockRequisitionItemRepository extends JpaRepository<StockRequisitionItem, Long> {
    List<StockRequisitionItem> findByRequisitionId(Long requisitionId);
    void deleteByRequisitionId(Long requisitionId);
}
