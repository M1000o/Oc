package com.kong.oc.controller;

import com.kong.oc.dto.ApiResponse;
import com.kong.oc.dto.ServicesRequest;
import com.kong.oc.dto.ServicesResponse;
import com.kong.oc.dto.BulkServicesRequest;
import com.kong.oc.dto.ProveedorResponse;
import com.kong.oc.interfaces.IServicesService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/services")
public class ServicesController {
    private final IServicesService servicesService;

    @PostMapping
    public ResponseEntity<ApiResponse<ServicesResponse>> create(@Valid @RequestBody ServicesRequest request){
        return ResponseEntity.ok(new ApiResponse<>("Servicio creado exitosamente", servicesService.create(request)));
    }

    @PostMapping("/bulk")
    public ResponseEntity<ApiResponse<List<ServicesResponse>>> createBulk(@Valid @RequestBody BulkServicesRequest request){
        return ResponseEntity.ok(new ApiResponse<>("Servicios creados exitosamente", servicesService.createBulk(request.nombres())));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ServicesResponse>> update(@PathVariable Long id, @Valid @RequestBody ServicesRequest request){
        return ResponseEntity.ok(new ApiResponse<>("Servicio actualizado exitosamente", servicesService.update(id, request)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ServicesResponse>> getById(@PathVariable Long id){
        return ResponseEntity.ok(new ApiResponse<>("Servicio obtenido exitosamente", servicesService.getById(id)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ServicesResponse>>> listAll(){
        return ResponseEntity.ok(new ApiResponse<>("Servicios obtenidos exitosamente", servicesService.listAll()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id){
        servicesService.softdelete(id);
        return ResponseEntity.ok(new ApiResponse<>("Servicio eliminado exitosamente", null));
    }

    @GetMapping("/{id}/suppliers")
    public ResponseEntity<ApiResponse<List<ProveedorResponse>>> getSuppliersByService(@PathVariable Long id){
        return ResponseEntity.ok(new ApiResponse<>("Proveedores por servicio obtenidos exitosamente", servicesService.listSuppliersByService(id)));
    }
}
