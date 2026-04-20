package com.kong.oc.repository;

import com.kong.oc.model.PurchaseOrder;
import com.kong.oc.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {
    List<PurchaseOrder> findBySupplier(Supplier supplier);
    List<PurchaseOrder> findBySupplier_Id(Long supplierId);
}

