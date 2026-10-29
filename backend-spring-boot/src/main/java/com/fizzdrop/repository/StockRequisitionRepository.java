package com.fizzdrop.repository;

import com.fizzdrop.entity.StockRequisition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockRequisitionRepository extends JpaRepository<StockRequisition, Long> {
    Optional<StockRequisition> findByRequisitionCode(String requisitionCode);
    List<StockRequisition> findBySupplierIdOrderByCreatedAtDesc(Long supplierId);
    List<StockRequisition> findByStatusOrderByCreatedAtDesc(String status);
    List<StockRequisition> findByDistrictIdOrderByCreatedAtDesc(Long districtId);
    List<StockRequisition> findByStatusAndDistrictIdOrderByCreatedAtDesc(String status, Long districtId);
    List<StockRequisition> findAllByOrderByCreatedAtDesc();
}
