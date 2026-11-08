package com.fizzdrop.repository;

import com.fizzdrop.entity.SalesOfficer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SalesOfficerRepository extends JpaRepository<SalesOfficer, Long> {

    List<SalesOfficer> findBySupplierId(Long supplierId);

    List<SalesOfficer> findBySupplierIdAndStatus(Long supplierId, String status);

    Optional<SalesOfficer> findByOfficerCode(String officerCode);

    List<SalesOfficer> findByCityIgnoreCaseAndAssignedAreaIgnoreCase(String city, String assignedArea);

    Optional<SalesOfficer> findFirstBySupplierIdAndCityIgnoreCaseAndAssignedAreaIgnoreCase(Long supplierId, String city, String assignedArea);

    List<SalesOfficer> findByStatus(String status);
}
