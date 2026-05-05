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

    /** Envía por correo la orden de compra registrada. */
    PurchaseOrderEmailResponse sendEmail(Long orderId, PurchaseOrderEmailRequest request, Long userId);

    /** Listado de órdenes enviadas al proveedor autenticado. */
    Page<PurchaseOrderSummary> findSentOrdersForSupplierUser(Long userId, Pageable pageable);

    /** Listado de órdenes enviadas para un proveedor específico (vista administrador). */
    Page<PurchaseOrderSummary> findSentOrdersForSupplier(Long supplierId, Pageable pageable);

    /** Detalle de orden enviada según alcance del usuario autenticado. */
    PurchaseOrderResponse findSentOrderDetail(Long orderId, Long userId, boolean isAdmin);

    /** Descarga PDF de una orden de compra según permisos del usuario autenticado. */
    PurchaseOrderPdfDownload downloadPdf(Long orderId, Long userId, boolean isAdmin);
}
