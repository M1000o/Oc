package com.kong.oc.service;

import com.kong.oc.common.exception.BadRequestException;
import com.kong.oc.common.exception.ResourceNotFoundException;
import com.kong.oc.dto.UnitRequest;
import com.kong.oc.dto.UnitResponse;
import com.kong.oc.interfaces.IUnitService;
import com.kong.oc.model.Unit;
import com.kong.oc.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UnitServiceImpl implements IUnitService {

    private final UnitRepository unitRepository;

    @Override
    @Transactional(readOnly = true)
    public List<UnitResponse> listAll() {
        return unitRepository.findByIsDeletedFalseOrderByNombreAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public UnitResponse getById(Long id) {
        return toResponse(findActiveUnitById(id));
    }

    @Override
    @Transactional
    public UnitResponse create(UnitRequest request) {
        String codigo = normalizeCodigo(request.codigo());
        validateUniqueCodigo(codigo, null);

        Unit unit = Unit.builder()
                .codigo(codigo)
                .nombre(normalizeNombre(request.nombre()))
                .build();
        return toResponse(unitRepository.save(unit));
    }

    @Override
    @Transactional
    public UnitResponse update(Long id, UnitRequest request) {
        Unit unit = findActiveUnitById(id);
        String codigo = normalizeCodigo(request.codigo());
        validateUniqueCodigo(codigo, id);

        unit.setCodigo(codigo);
        unit.setNombre(normalizeNombre(request.nombre()));
        return toResponse(unitRepository.save(unit));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Unit unit = findActiveUnitById(id);
        unit.softDelete();
        unitRepository.save(unit);
    }

    private Unit findActiveUnitById(Long id) {
        return unitRepository.findById(id)
                .filter(unit -> !Boolean.TRUE.equals(unit.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Unidad de medida no encontrada con ID: " + id));
    }

    private void validateUniqueCodigo(String codigo, Long currentUnitId) {
        unitRepository.findByCodigoIgnoreCaseAndIsDeletedFalse(codigo)
                .filter(existing -> !existing.getId().equals(currentUnitId))
                .ifPresent(existing -> {
                    throw new BadRequestException("El codigo de la unidad de medida ya existe");
                });
    }

    private String normalizeCodigo(String value) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException("El codigo de la unidad de medida es obligatorio");
        }
        return value.trim().toUpperCase();
    }

    private String normalizeNombre(String value) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException("El nombre de la unidad de medida es obligatorio");
        }
        return value.trim();
    }

    private UnitResponse toResponse(Unit unit) {
        return new UnitResponse(unit.getId(), unit.getCodigo(), unit.getNombre());
    }
}
