package com.kong.oc.controller;

import com.kong.oc.dto.ApiResponse;
import com.kong.oc.dto.PurchaseOrderResponse;
import com.kong.oc.interfaces.IPurchaseOrderService;
import com.kong.oc.security.UserDetailsImpl;
import com.kong.oc.service.PurchaseOrderServiceImpl;
import com.kong.oc.interfaces.ISupplierService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/purchase-orders")
@RequiredArgsConstructor
public class PurchaseOrderController {

    private final IPurchaseOrderService purchaseOrderService;
    private final ISupplierService supplierService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PurchaseOrderResponse>>> list(@AuthenticationPrincipal UserDetailsImpl userDetails){
        // Si el usuario tiene ROLE_PROVEEDOR, obtener su supplier (si existe) y devolver solo sus ordenes
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
        // Para otros roles (ADMIN, etc.) devolver todas
        return ResponseEntity.ok(new ApiResponse<>("Ordenes obtenidas", purchaseOrderService.listAll()));
    }
}
