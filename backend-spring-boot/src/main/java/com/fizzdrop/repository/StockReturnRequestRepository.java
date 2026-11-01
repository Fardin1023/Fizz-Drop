package com.fizzdrop.repository;

import com.fizzdrop.entity.StockReturnRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockReturnRequestRepository extends JpaRepository<StockReturnRequest, Long> {

    List<StockReturnRequest> findBySupplierIdOrderByCreatedAtDesc(Long supplierId);

    List<StockReturnRequest> findAllByOrderByCreatedAtDesc();

    List<StockReturnRequest> findByStatusOrderByCreatedAtDesc(String status);

    Optional<StockReturnRequest> findByReturnCode(String returnCode);

    List<StockReturnRequest> findByRequisitionId(Long requisitionId);

    long countBySupplierIdAndStatus(Long supplierId, String status);
}
