package com.fizzdrop.repository;

import com.fizzdrop.entity.DistrictInventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DistrictInventoryRepository extends JpaRepository<DistrictInventory, Long> {
    Optional<DistrictInventory> findByDistrictIdAndProductId(Long districtId, Long productId);
    List<DistrictInventory> findByDistrictId(Long districtId);
    List<DistrictInventory> findByProductId(Long productId);
}
