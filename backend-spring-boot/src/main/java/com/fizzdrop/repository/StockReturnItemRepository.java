package com.fizzdrop.repository;

import com.fizzdrop.entity.StockReturnItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockReturnItemRepository extends JpaRepository<StockReturnItem, Long> {

    List<StockReturnItem> findByReturnRequestId(Long returnRequestId);

    void deleteByReturnRequestId(Long returnRequestId);
}
