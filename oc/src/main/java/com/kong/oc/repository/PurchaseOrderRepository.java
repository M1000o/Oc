package com.kong.oc.repository;

import com.kong.oc.model.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {
    boolean existsByPurchaseOrderNumber(String purchaseOrderNumber);
    List<PurchaseOrder> findByIsDeletedFalse();
    List<PurchaseOrder> findBySupplier_IdAndIsDeletedFalse(Long supplierId);
}
