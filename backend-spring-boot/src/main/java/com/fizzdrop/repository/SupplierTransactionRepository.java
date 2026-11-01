package com.fizzdrop.repository;

import com.fizzdrop.entity.SupplierTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupplierTransactionRepository extends JpaRepository<SupplierTransaction, Long> {

    List<SupplierTransaction> findBySupplierIdOrderByCreatedAtDesc(Long supplierId);

    List<SupplierTransaction> findByRequisitionId(Long requisitionId);

    boolean existsByRequisitionIdAndType(Long requisitionId, String type);
}
