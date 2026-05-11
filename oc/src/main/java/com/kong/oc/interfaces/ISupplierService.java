package com.kong.oc.interfaces;

import com.kong.oc.dto.ProveedorResponse;
import com.kong.oc.dto.ServicioResponse;
import com.kong.oc.dto.SupplierDirectoryDetailResponse;
import com.kong.oc.dto.SupplierDirectoryItemResponse;
import com.kong.oc.dto.SupplierFormRequest;
import com.kong.oc.model.Supplier;

import java.util.List;

public interface ISupplierService {
    List<ProveedorResponse> listAll();

    List<SupplierDirectoryItemResponse> listDirectory();

    SupplierDirectoryDetailResponse getDirectoryDetail(Long supplierId);

    List<ServicioResponse> listServiciosByProveedor(Long proveedorId);

    Supplier createFromForm(SupplierFormRequest req);
}
