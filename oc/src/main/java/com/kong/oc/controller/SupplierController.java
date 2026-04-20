package com.kong.oc.controller;

import com.kong.oc.dto.ApiResponse;
import com.kong.oc.dto.ProveedorResponse;
import com.kong.oc.dto.ServicioResponse;
import com.kong.oc.interfaces.ISupplierService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/proveedores")
public class SupplierController {

    private final ISupplierService supplierService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProveedorResponse>>> listAll(){
        return ResponseEntity.ok(new ApiResponse<>("Proveedores obtenidos exitosamente", supplierService.listAll()));
    }

    @GetMapping("/{id}/servicios")
    public ResponseEntity<ApiResponse<List<ServicioResponse>>> listServiciosByProveedor(@PathVariable Long id){
        return ResponseEntity.ok(new ApiResponse<>("Servicios del proveedor obtenidos exitosamente", supplierService.listServiciosByProveedor(id)));
    }
}

