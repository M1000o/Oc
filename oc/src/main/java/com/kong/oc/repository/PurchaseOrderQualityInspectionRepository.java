package com.kong.oc.repository;

import com.kong.oc.model.PurchaseOrderQualityInspection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PurchaseOrderQualityInspectionRepository extends JpaRepository<PurchaseOrderQualityInspection, Long> {
    Optional<PurchaseOrderQualityInspection> findByPurchaseOrderId(Long purchaseOrderId);
}
