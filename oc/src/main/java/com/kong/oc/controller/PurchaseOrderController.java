package com.kong.oc.controller;

import com.kong.oc.dto.ApiResponse;
import com.kong.oc.dto.PurchaseOrderRequest;
import com.kong.oc.dto.PurchaseOrderResponse;
import com.kong.oc.interfaces.IPurchaseOrderService;
import com.kong.oc.interfaces.ISupplierService;
import com.kong.oc.security.UserDetailsImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/purchase-orders")
@RequiredArgsConstructor
public class PurchaseOrderController {

    private final IPurchaseOrderService purchaseOrderService;
    private final ISupplierService supplierService;

    @GetMapping("/next-number")
    public ResponseEntity<ApiResponse<String>> previewNextPurchaseOrderNumber() {
        return ResponseEntity.ok(
                new ApiResponse<>("Siguiente numero de orden generado", purchaseOrderService.previewNextPurchaseOrderNumber())
        );
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> create(
            @Valid @RequestBody PurchaseOrderRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails
    ) {
        Long userId = userDetails != null ? userDetails.getId() : null;
        return ResponseEntity.ok(new ApiResponse<>("Orden de compra creada", purchaseOrderService.create(request, userId)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> update(@PathVariable Long id, @Valid @RequestBody PurchaseOrderRequest request) {
        return ResponseEntity.ok(new ApiResponse<>("Orden de compra actualizada", purchaseOrderService.update(id, request)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(new ApiResponse<>("Orden de compra obtenida", purchaseOrderService.getById(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        purchaseOrderService.softDelete(id);
        return ResponseEntity.ok(new ApiResponse<>("Orden de compra eliminada", null));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PurchaseOrderResponse>>> list(@AuthenticationPrincipal UserDetailsImpl userDetails){
        if (userDetails != null) {
            boolean isProveedor = userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_PROVEEDOR"));
            if (isProveedor) {
                Long userId = userDetails.getId();
                var supplierOpt = supplierService.findByUserId(userId);
                if (supplierOpt.isEmpty()) {
                    return ResponseEntity.ok(new ApiResponse<>("No se encontraron ordenes para este proveedor", List.of()));
                }
                Long supplierId = supplierOpt.get().getId();
                return ResponseEntity.ok(new ApiResponse<>("Ordenes del proveedor obtenidas", purchaseOrderService.listBySupplierId(supplierId)));
            }
        }

        return ResponseEntity.ok(new ApiResponse<>("Ordenes obtenidas", purchaseOrderService.listAll()));
    }
}
