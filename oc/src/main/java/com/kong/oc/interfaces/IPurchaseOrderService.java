package com.kong.oc.interfaces;

import com.kong.oc.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface IPurchaseOrderService {

    //List<PurchaseOrderResponse> listBySupplierId(Long supplierId);
    /** Crea una orden. Si saveDraft=true queda en DRAFT, si no en PENDING. */
    PurchaseOrderResponse create(PurchaseOrderRequest request, Long userId);

    /** Actualiza una orden. Solo se permite en estado DRAFT. */
    PurchaseOrderResponse update(Long id, PurchaseOrderRequest request);

    /** Cambia el status con las transiciones permitidas. */
    PurchaseOrderResponse changeStatus(Long id, PurchaseOrderStatus statusDTO);

    /** Retorna el detalle completo de una orden. */
    PurchaseOrderResponse findById(Long id);

    /** Listado paginado con filtros opcionales. */
    Page<PurchaseOrderSummary> findAll(PurchaseOrderFilter filter, Pageable pageable);
}
