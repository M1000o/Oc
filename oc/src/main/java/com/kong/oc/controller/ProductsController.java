package com.kong.oc.controller;

import com.kong.oc.dto.ApiResponse;
import com.kong.oc.dto.ProductRequest;
import com.kong.oc.dto.ProductResponse;
import com.kong.oc.interfaces.IProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/products")
public class ProductsController {
    private final IProductService productService;

    @PostMapping
    public ResponseEntity<ApiResponse<ProductResponse>> create(@Valid @RequestBody ProductRequest request){
        return ResponseEntity.ok(new ApiResponse<>("Producto creado exitosamente", productService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> update(@PathVariable Long id, @Valid @RequestBody ProductRequest request){
        return ResponseEntity.ok(new ApiResponse<>("Producto actualizado exitosamente", productService.update(id, request)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> getById(@PathVariable Long id){
        return ResponseEntity.ok(new ApiResponse<>("Producto obtenido exitosamente", productService.getById(id)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductResponse>>> listAll(){
        return ResponseEntity.ok(new ApiResponse<>("Productos obtenidos exitosamente", productService.listAll()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id){
        productService.softdelete(id);
        return ResponseEntity.ok(new ApiResponse<>("Producto eliminado exitosamente", null));
    }

    @GetMapping("/by-supplier/{supplierId}")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> listBySupplier(@PathVariable Long supplierId){
        return ResponseEntity.ok(new ApiResponse<>("Productos por proveedor obtenidos exitosamente", productService.listByProveedor(supplierId)));
    }

    @GetMapping("/by-service/{serviceId}")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> listByService(@PathVariable Long serviceId){
        return ResponseEntity.ok(new ApiResponse<>("Productos por servicio obtenidos exitosamente", productService.listByServicio(serviceId)));
    }

    @GetMapping("/by-service/{serviceId}/by-supplier/{supplierId}")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> listByServiceAndSupplier(@PathVariable Long serviceId, @PathVariable Long supplierId){
        return ResponseEntity.ok(new ApiResponse<>("Productos por servicio y proveedor obtenidos exitosamente", productService.listByServicioAndProveedor(serviceId, supplierId)));
    }
}

