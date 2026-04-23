package com.kong.oc.interfaces;

import com.kong.oc.dto.PurchaseOrderRequest;
import com.kong.oc.dto.PurchaseOrderResponse;

import java.util.List;

public interface IPurchaseOrderService {

    String previewNextPurchaseOrderNumber();
    List<PurchaseOrderResponse> listAll();
    List<PurchaseOrderResponse> listBySupplierId(Long supplierId);
    PurchaseOrderResponse getById(Long id);
    PurchaseOrderResponse create(PurchaseOrderRequest request, Long userId);
    PurchaseOrderResponse update(Long id, PurchaseOrderRequest request);
    void softDelete(Long id);
}
