package com.fizzdrop.repository;

import com.fizzdrop.entity.DistrictProductPricing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DistrictProductPricingRepository extends JpaRepository<DistrictProductPricing, Long> {

    List<DistrictProductPricing> findByDistrictId(Long districtId);

    Optional<DistrictProductPricing> findByDistrictIdAndProductId(Long districtId, Long productId);

    List<DistrictProductPricing> findByProductId(Long productId);

    void deleteByDistrictId(Long districtId);

    void deleteByProductId(Long productId);
}
