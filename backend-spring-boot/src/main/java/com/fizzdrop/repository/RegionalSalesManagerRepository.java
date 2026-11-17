package com.fizzdrop.repository;

import com.fizzdrop.entity.RegionalSalesManager;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RegionalSalesManagerRepository extends JpaRepository<RegionalSalesManager, Long> {
    Optional<RegionalSalesManager> findByDivisionIgnoreCase(String division);
    Optional<RegionalSalesManager> findByCode(String code);
    Optional<RegionalSalesManager> findByEmail(String email);
}
