package com.kong.oc.service;

import com.kong.oc.dto.ProveedorResponse;
import com.kong.oc.dto.ServicioResponse;
import com.kong.oc.interfaces.ISupplierService;
import com.kong.oc.model.Services;
import com.kong.oc.model.Supplier;
import com.kong.oc.repository.SupplierRepository;
import com.kong.oc.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SupplierServiceImpl implements ISupplierService {

    private final SupplierRepository supplierRepository;

    @Override
    public List<ProveedorResponse> listAll() {
        return supplierRepository.findAll()
                .stream()
                .map(this::toDto)
                .toList();
    }

    private ProveedorResponse toDto(Supplier s){
        return new ProveedorResponse(
                s.getId(),
                s.getRazonSocial(),
                s.getRuc()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServicioResponse> listServiciosByProveedor(Long proveedorId) {
        Supplier supplier = supplierRepository.findById(proveedorId)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado"));
        List<Services> servicios = supplier.getServicios();
        if (servicios == null) return List.of();
        return servicios.stream()
                .map(s -> new ServicioResponse(s.getId(), s.getNombre()))
                .toList();
    }

    @Override
    public Optional<Supplier> findByUserId(Long userId) {
        return supplierRepository.findAll().stream()
                .filter(s -> s.getUser() != null && s.getUser().getId().equals(userId))
                .findFirst();
    }

}
