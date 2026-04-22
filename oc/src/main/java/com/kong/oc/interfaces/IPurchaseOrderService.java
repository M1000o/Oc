package com.kong.oc.interfaces;

import com.kong.oc.dto.PurchaseOrderResponse;

import java.util.List;

public interface IPurchaseOrderService {

    List<PurchaseOrderResponse> listAll();
    List<PurchaseOrderResponse> listBySupplierId(Long supplierId);
}
