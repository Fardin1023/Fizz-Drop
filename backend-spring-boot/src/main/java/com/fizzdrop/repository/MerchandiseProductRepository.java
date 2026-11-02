package com.fizzdrop.repository;

import com.fizzdrop.entity.MerchandiseProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MerchandiseProductRepository extends JpaRepository<MerchandiseProduct, Long> {

    List<MerchandiseProduct> findByBrandIgnoreCase(String brand);

    List<MerchandiseProduct> findByItemTypeIgnoreCase(String itemType);

    Optional<MerchandiseProduct> findBySku(String sku);

    @Query("SELECT m FROM MerchandiseProduct m WHERE " +
           "LOWER(m.name) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(m.brand) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(m.itemType) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(m.sku) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<MerchandiseProduct> searchMerchandise(@Param("q") String query);
}
