package com.fizzdrop.repository;

import com.fizzdrop.entity.AreaSalesManager;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AreaSalesManagerRepository extends JpaRepository<AreaSalesManager, Long> {
    List<AreaSalesManager> findByRsmId(Long rsmId);
    List<AreaSalesManager> findByDivisionIgnoreCase(String division);
    Optional<AreaSalesManager> findByDistrictId(Long districtId);
    Optional<AreaSalesManager> findByCode(String code);
    Optional<AreaSalesManager> findByEmail(String email);
}
