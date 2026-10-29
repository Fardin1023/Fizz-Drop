package com.fizzdrop.repository;

import com.fizzdrop.entity.CentralInventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CentralInventoryRepository extends JpaRepository<CentralInventory, Long> {

    Optional<CentralInventory> findByProductId(Long productId);

    List<CentralInventory> findByCategory(String category);
}
