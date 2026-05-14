package com.kong.oc.controller;

import com.kong.oc.common.exception.BadRequestException;
import com.kong.oc.common.http.PdfResponseFactory;
import com.kong.oc.dto.*;
import com.kong.oc.interfaces.IPurchaseOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/purchase-orders")
@RequiredArgsConstructor
public class PurchaseOrderController {

    private final IPurchaseOrderService purchaseOrderService;


    @PostMapping
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> create(
            @Valid @RequestBody PurchaseOrderRequest request,
            @AuthenticationPrincipal Jwt jwt
            ) {

        if(jwt == null) throw new BadRequestException("Usuario no autenticado");
        Long userId = Long.parseLong(jwt.getSubject());

        return ResponseEntity.ok(new ApiResponse<>("Orden de compra creada", purchaseOrderService.create(request, userId)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> update(@PathVariable Long id, @Valid @RequestBody PurchaseOrderRequest request) {
        return ResponseEntity.ok(new ApiResponse<>("Orden de compra actualizada", purchaseOrderService.update(id, request)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(new ApiResponse<>("Orden de compra obtenida", purchaseOrderService.findById(id)));
    }

    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAuthority('READ_OWN_PURCHASE_ORDERS')")
    public ResponseEntity<byte[]> downloadPdf(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        PurchaseOrderPdfDownload pdf = purchaseOrderService.downloadPdf(id, extractUserId(jwt), isAdmin(jwt));

        return PdfResponseFactory.attachment(pdf.fileName(), pdf.content());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<PurchaseOrderSummary>>> findAll(
            @ModelAttribute PurchaseOrderFilter filter,
            @PageableDefault(size = 10, sort = "orderDate", direction = Sort.Direction.DESC) Pageable pageable
            ) {
                Page<PurchaseOrderSummary> result = purchaseOrderService.findAll(filter, pageable);
                return ResponseEntity.ok(new ApiResponse<>("Listado de órdenes de compra", result));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> changeStatus(
            @PathVariable Long id,
            @Valid @RequestBody PurchaseOrderStatus statusDTO
    ) {
        return ResponseEntity.ok(
                new ApiResponse<>(
                        "Estado de orden de compra actualizado",
                        purchaseOrderService.changeStatus(id, statusDTO)
                )
        );
    }

    @PatchMapping("/{id}/delivery-status")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> changeDeliveryStatus(
            @PathVariable Long id,
            @Valid @RequestBody DeliveryStatusPayload deliveryStatusDTO
    ) {
        return ResponseEntity.ok(
                new ApiResponse<>(
                        "Estado de entrega de orden de compra actualizado",
                        purchaseOrderService.changeDeliveryStatus(id, deliveryStatusDTO)
                )
        );
    }

    @PostMapping("/{id}/send-email")
    public ResponseEntity<ApiResponse<PurchaseOrderEmailResponse>> sendEmail(
            @PathVariable Long id,
            @Valid @RequestBody PurchaseOrderEmailRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        if (jwt == null) throw new BadRequestException("Usuario no autenticado");
        Long userId = Long.parseLong(jwt.getSubject());

        return ResponseEntity.ok(
                new ApiResponse<>(
                        "Correo de orden de compra enviado al proveedor y OC aprobada",
                        purchaseOrderService.sendEmail(id, request, userId)
                )
        );
    }

    //PROV - Ordenes enviadas sin detalle
    @GetMapping("/supplier-view")
    @PreAuthorize("hasAuthority('READ_OWN_PURCHASE_ORDERS') and !hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<PurchaseOrderSummary>>> getSupplierSentOrders(
            @AuthenticationPrincipal Jwt jwt,
            @PageableDefault(size = 10, sort = "orderDate", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(
                new ApiResponse<>(
                        "Órdenes enviadas al proveedor autenticado",
                        purchaseOrderService.findSentOrdersForSupplierUser(extractUserId(jwt), pageable)
                )
        );
    }

    //ADMIN - Ordenes enviadas a un proveedor especifico sin detalle
    @GetMapping("/supplier-view/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<PurchaseOrderSummary>>> getSupplierSentOrdersBySupplier(
            @PathVariable Long id,
            @PageableDefault(size = 10, sort = "orderDate", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(
                new ApiResponse<>(
                        "Órdenes enviadas al proveedor",
                        purchaseOrderService.findSentOrdersForSupplier(id, pageable)
                )
        );
    }

    //ADMIN/PROV - Detalle de orden enviada
    @GetMapping("/supplier-view/order/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('READ_OWN_PURCHASE_ORDERS')")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> getSupplierSentOrderDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(
                new ApiResponse<>(
                        "Detalle de orden enviada",
                        purchaseOrderService.findSentOrderDetail(id, extractUserId(jwt), isAdmin(jwt))
                )
        );
    }

    private Long extractUserId(Jwt jwt) {
        if (jwt == null) throw new BadRequestException("Usuario no autenticado");
        return Long.parseLong(jwt.getSubject());
    }

    private boolean isAdmin(Jwt jwt) {
        var roles = jwt.getClaimAsStringList("roles");
        return roles != null && roles.contains("ADMIN");
    }
}
