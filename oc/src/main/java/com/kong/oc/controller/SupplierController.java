package com.kong.oc.controller;

import com.kong.oc.dto.ApiResponse;
import com.kong.oc.dto.ProveedorResponse;
import com.kong.oc.dto.ServicioResponse;
import com.kong.oc.dto.SupplierDirectoryDetailResponse;
import com.kong.oc.dto.SupplierDirectoryItemResponse;
import com.kong.oc.dto.SupplierFormRequest;
import com.kong.oc.interfaces.ISupplierService;
import com.kong.oc.model.Supplier;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/suppliers")
@RequiredArgsConstructor
public class SupplierController {
    private final ISupplierService supplierService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProveedorResponse>>> listAll(){
        return ResponseEntity.ok(new ApiResponse<>("Proveedores obtenidos exitosamente", supplierService.listAll()));
    }

    @GetMapping("/directory")
    public ResponseEntity<ApiResponse<List<SupplierDirectoryItemResponse>>> listDirectory() {
        return ResponseEntity.ok(
                new ApiResponse<>("Directorio de proveedores obtenido exitosamente", supplierService.listDirectory())
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SupplierDirectoryDetailResponse>> getDirectoryDetail(@PathVariable Long id) {
        return ResponseEntity.ok(
                new ApiResponse<>("Detalle del proveedor obtenido exitosamente", supplierService.getDirectoryDetail(id))
        );
    }

    @GetMapping("/{id}/servicios")
    public ResponseEntity<ApiResponse<List<ServicioResponse>>> listServiciosByProveedor(@PathVariable Long id){
        return ResponseEntity.ok(new ApiResponse<>("Servicios del proveedor obtenidos exitosamente", supplierService.listServiciosByProveedor(id)));
    }

    @PostMapping("/form")
    public ResponseEntity<?> create(@Valid @RequestBody SupplierFormRequest req) {
        Supplier s = supplierService.createFromForm(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(
                Map.of("message", "Registro recibido. Email de activación enviado (o en cola). Revise su correo o la carpeta de spam." , "userId", s.getId())
        );
    }
}
