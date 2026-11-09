package com.fizzdrop.repository;

import com.fizzdrop.entity.PreSalesOfficer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PreSalesOfficerRepository extends JpaRepository<PreSalesOfficer, Long> {
    List<PreSalesOfficer> findBySalesOfficerId(Long salesOfficerId);
    Optional<PreSalesOfficer> findByPsrCode(String psrCode);
    Optional<PreSalesOfficer> findByEmailIgnoreCase(String email);
    Optional<PreSalesOfficer> findByUserId(Long userId);
    List<PreSalesOfficer> findByAssignedAreaIgnoreCase(String assignedArea);
}
