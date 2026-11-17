package com.fizzdrop.repository;

import com.fizzdrop.entity.SalesManagerReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SalesManagerReportRepository extends JpaRepository<SalesManagerReport, Long> {
    List<SalesManagerReport> findByRsmIdOrderBySubmittedAtDesc(Long rsmId);
    List<SalesManagerReport> findByAsmIdOrderBySubmittedAtDesc(Long asmId);
    List<SalesManagerReport> findByDistrictIdOrderBySubmittedAtDesc(Long districtId);
}
