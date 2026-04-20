package com.kong.oc.service;

import com.kong.oc.common.exception.BadRequestException;
import com.kong.oc.common.exception.ResourceNotFoundException;
import com.kong.oc.dto.ServicesRequest;
import com.kong.oc.dto.ServicesResponse;
import com.kong.oc.dto.ProveedorResponse;
import com.kong.oc.interfaces.IServicesService;
import com.kong.oc.model.Services;
import com.kong.oc.model.Supplier;
import com.kong.oc.repository.ServicesRepository;
import com.kong.oc.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ServicesServiceImpl implements IServicesService {

    private final ServicesRepository servicesRepository;
    private final SupplierRepository supplierRepository;

    @Transactional
    public ServicesResponse create(ServicesRequest request){
        String normalized = validateAndNormalizeName(request.nombre());
        if(servicesRepository.existsByNombreIgnoreCaseAndIsDeletedFalse(request.nombre())){
            throw new BadRequestException("El servicio ya existe");
        }
        Services s = Services.builder()
                .nombre(normalized)
                .build();
        servicesRepository.save(s);
        return toDto(s);
    }

    @Transactional
    public ServicesResponse update(Long id, ServicesRequest request){
        Services s = findActiveServiceById(id);
        String normalized = validateAndNormalizeName(request.nombre());
        s.setNombre(normalized);
        return toDto(s);
    }

    public ServicesResponse getById(Long id) {
        return toDto(findActiveServiceById(id));
    }

    public List<ServicesResponse> listAll() {
        return servicesRepository.findByIsDeletedFalse()
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public void softdelete(Long id) {
        Services s = findActiveServiceById(id);
        s.softDelete();
    }

    @Transactional
    public List<ServicesResponse> createBulk(List<String> nombres) {
        List<ServicesResponse> created = new ArrayList<>();
        for (String raw : nombres) {
            String normalized = normalize(raw);
            if (normalized == null || normalized.isBlank()) {
                // Saltar nombres vacíos
                continue;
            }
            // Si ya existe (no eliminado), omitir creación y devolver el existente
            if (servicesRepository.existsByNombreIgnoreCaseAndIsDeletedFalse(normalized)) {
                Services existing = servicesRepository.findByNombre(normalized);
                if (existing != null && !Boolean.TRUE.equals(existing.getIsDeleted())) {
                    created.add(toDto(existing));
                    continue;
                }
            }
            Services s = Services.builder()
                    .nombre(normalized)
                    .build();
            servicesRepository.save(s);
            created.add(toDto(s));
        }
        return created;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProveedorResponse> listSuppliersByService(Long serviceId) {
        // Validar que el servicio exista y no esté eliminado
        servicesRepository.findById(serviceId)
                .filter(s -> !Boolean.TRUE.equals(s.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("El servicio no existe"));

        // Obtener proveedores asociados y no eliminados
        List<Supplier> suppliers = supplierRepository.findByServicios_IdAndIsDeletedFalse(serviceId);

        return suppliers.stream().map(this::toProveedorDto).toList();
    }

    private ProveedorResponse toProveedorDto(Supplier s){
        return new ProveedorResponse(
                s.getId(),
                s.getRazonSocial(),
                s.getRuc()
        );
    }

    private String validateAndNormalizeName(String name) {
        String normalized = normalize(name);
        if (normalized == null || normalized.isBlank()) {
            throw new BadRequestException("El nombre del servicio es obligatorio");
        }
        return normalized;
    }

    private String normalize(String input){
        return input == null ? null : input.trim().replaceAll("\\s+"," ");
    }

    private ServicesResponse toDto(Services s){
        return new ServicesResponse(
                s.getId(),
                s.getNombre()
        );
    }

    private Services findActiveServiceById(Long id) {
        return servicesRepository.findById(id)
                .filter(s -> !Boolean.TRUE.equals(s.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("El servicio no existe"));
    }

}
