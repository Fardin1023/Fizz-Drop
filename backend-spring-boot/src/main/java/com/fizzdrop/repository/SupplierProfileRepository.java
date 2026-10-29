package com.fizzdrop.repository;

import com.fizzdrop.entity.SupplierProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SupplierProfileRepository extends JpaRepository<SupplierProfile, Long> {
    Optional<SupplierProfile> findByUserId(Long userId);
}
