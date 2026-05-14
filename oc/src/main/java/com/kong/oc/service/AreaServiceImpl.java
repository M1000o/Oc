package com.kong.oc.service;

import com.kong.oc.common.exception.ResourceNotFoundException;
import com.kong.oc.dto.AreaRequest;
import com.kong.oc.dto.AreaResponse;
import com.kong.oc.interfaces.IAreaService;
import com.kong.oc.model.Area;
import com.kong.oc.model.Sede;
import com.kong.oc.repository.AreaRepository;
import com.kong.oc.repository.SedeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AreaServiceImpl implements IAreaService {

    private final AreaRepository areaRepository;
    private final SedeRepository sedeRepository;

    @Override
    @Transactional(readOnly = true)
    public List<AreaResponse> listAll() {
        return areaRepository.findByIsDeletedFalseOrderByNombreAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AreaResponse> listBySede(Long sedeId) {
        validateActiveSede(sedeId);
        return areaRepository.findBySede_IdAndIsDeletedFalseOrderByNombreAsc(sedeId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AreaResponse getById(Long id) {
        return toResponse(findActiveAreaById(id));
    }

    @Override
    @Transactional
    public AreaResponse create(AreaRequest request) {
        Sede sede = findActiveSedeById(request.sedeId());
        Area area = Area.builder()
                .nombre(request.nombre())
                .sede(sede)
                .build();
        return toResponse(areaRepository.save(area));
    }

    @Override
    @Transactional
    public AreaResponse update(Long id, AreaRequest request) {
        Area area = findActiveAreaById(id);
        Sede sede = findActiveSedeById(request.sedeId());
        area.setNombre(request.nombre());
        area.setSede(sede);
        return toResponse(areaRepository.save(area));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Area area = findActiveAreaById(id);
        area.softDelete();
        areaRepository.save(area);
    }

    private void validateActiveSede(Long sedeId) {
        sedeRepository.findById(sedeId)
                .filter(sede -> !Boolean.TRUE.equals(sede.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Sede no encontrada con ID: " + sedeId));
    }

    private Sede findActiveSedeById(Long id) {
        return sedeRepository.findById(id)
                .filter(sede -> !Boolean.TRUE.equals(sede.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Sede no encontrada con ID: " + id));
    }

    private Area findActiveAreaById(Long id) {
        return areaRepository.findById(id)
                .filter(area -> !Boolean.TRUE.equals(area.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Área no encontrada con ID: " + id));
    }

    private AreaResponse toResponse(Area area) {
        return new AreaResponse(
                area.getId(),
                area.getNombre(),
                area.getSede().getId(),
                area.getSede().getName()
        );
    }
}
