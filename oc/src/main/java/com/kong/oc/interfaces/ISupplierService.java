package com.kong.oc.interfaces;

import com.kong.oc.dto.ProveedorResponse;
import com.kong.oc.dto.ServicioResponse;
import com.kong.oc.model.Supplier;

import java.util.List;
import java.util.Optional;

public interface ISupplierService {
    List<ProveedorResponse> listAll();

    List<ServicioResponse> listServiciosByProveedor(Long proveedorId);

    Optional<Supplier> findByUserId(Long userId);
}
