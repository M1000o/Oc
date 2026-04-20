package com.kong.oc.interfaces;

import com.kong.oc.dto.ProductRequest;
import com.kong.oc.dto.ProductResponse;

import java.util.List;

public interface IProductService {
    ProductResponse create(ProductRequest request);
    ProductResponse update(Long id, ProductRequest request);
    ProductResponse getById(Long id);
    List<ProductResponse> listAll();
    void softdelete(Long id);
    List<ProductResponse> listByProveedor(Long proveedorId);
    List<ProductResponse> listByServicio(Long servicioId);
    List<ProductResponse> listByServicioAndProveedor(Long servicioId, Long proveedorId);
}

