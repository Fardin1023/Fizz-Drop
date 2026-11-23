package com.fizzdrop.repository;

import com.fizzdrop.entity.FreeStockTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FreeStockTransactionRepository extends JpaRepository<FreeStockTransaction, Long> {

    List<FreeStockTransaction> findAllByOrderByTransactionDateDesc();

    List<FreeStockTransaction> findByFreeStockIdOrderByTransactionDateDesc(Long freeStockId);

    List<FreeStockTransaction> findByOfferIdOrderByTransactionDateDesc(Long offerId);

    List<FreeStockTransaction> findByDistrictIdOrderByTransactionDateDesc(Long districtId);

    List<FreeStockTransaction> findByOutletIdOrderByTransactionDateDesc(Long outletId);

    List<FreeStockTransaction> findByRequisitionCode(String requisitionCode);
}
