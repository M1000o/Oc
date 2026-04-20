package com.kong.oc.interfaces;

import com.kong.oc.dto.ServicesRequest;
import com.kong.oc.dto.ServicesResponse;
import com.kong.oc.dto.ProveedorResponse;

import java.util.List;

public interface IServicesService {

    ServicesResponse create(ServicesRequest request);
    ServicesResponse update(Long id, ServicesRequest request);
    ServicesResponse getById(Long id);
    List<ServicesResponse> listAll();
    void softdelete(Long id);
    List<ServicesResponse> createBulk(List<String> nombres);
    List<ProveedorResponse> listSuppliersByService(Long serviceId);
}
