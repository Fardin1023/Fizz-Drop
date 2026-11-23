package com.fizzdrop.repository;

import com.fizzdrop.entity.TradeOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TradeOfferRepository extends JpaRepository<TradeOffer, Long> {

    List<TradeOffer> findAllByOrderByCreatedAtDesc();

    List<TradeOffer> findByDistrictId(Long districtId);

    List<TradeOffer> findByDistrictIdAndStatus(Long districtId, String status);

    List<TradeOffer> findByStatusOrderByCreatedAtDesc(String status);

    List<TradeOffer> findByDistrictIdInAndStatus(List<Long> districtIds, String status);
}
