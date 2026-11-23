package com.fizzdrop.repository;

import com.fizzdrop.entity.FreeStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FreeStockRepository extends JpaRepository<FreeStock, Long> {

    List<FreeStock> findAllByOrderByCreatedAtDesc();

    List<FreeStock> findByDistrictId(Long districtId);

    List<FreeStock> findByProductId(Long productId);

    List<FreeStock> findByStatus(String status);

    Optional<FreeStock> findByOfferId(Long offerId);

    Optional<FreeStock> findByDistrictIdAndProductId(Long districtId, Long productId);
}
