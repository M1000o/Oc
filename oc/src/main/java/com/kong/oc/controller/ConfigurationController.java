package com.kong.oc.controller;

import com.kong.oc.dto.ApiResponse;
import com.kong.oc.dto.PurchaseOrderCompanyConfigurationRequest;
import com.kong.oc.dto.PurchaseOrderCompanyConfigurationResponse;
import com.kong.oc.service.PurchaseOrderCompanyConfigurationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/configuration")
@RequiredArgsConstructor
public class ConfigurationController {

    private final PurchaseOrderCompanyConfigurationService configurationService;

    @GetMapping("/purchase-order-company")
    public ResponseEntity<ApiResponse<PurchaseOrderCompanyConfigurationResponse>> getPurchaseOrderCompany() {
        return ResponseEntity.ok(
                new ApiResponse<>(
                        "Configuración de órdenes de compra obtenida",
                        configurationService.getConfiguration()
                )
        );
    }

    @PutMapping("/purchase-order-company")
    public ResponseEntity<ApiResponse<PurchaseOrderCompanyConfigurationResponse>> updatePurchaseOrderCompany(
            @Valid @RequestBody PurchaseOrderCompanyConfigurationRequest request
    ) {
        return ResponseEntity.ok(
                new ApiResponse<>(
                        "Configuración de órdenes de compra actualizada",
                        configurationService.updateConfiguration(request)
                )
        );
    }
}
