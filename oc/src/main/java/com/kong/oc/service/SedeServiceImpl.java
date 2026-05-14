package com.kong.oc.service;

import com.kong.oc.common.exception.ResourceNotFoundException;
import com.kong.oc.dto.SedeRequest;
import com.kong.oc.dto.SedeResponse;
import com.kong.oc.interfaces.ISedeService;
import com.kong.oc.model.Sede;
import com.kong.oc.repository.SedeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SedeServiceImpl implements ISedeService {

    private final SedeRepository sedeRepository;

    @Override
    @Transactional(readOnly = true)
    public List<SedeResponse> listAll() {
        return sedeRepository.findByIsDeletedFalseOrderByNameAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SedeResponse getById(Long id) {
        return toResponse(findActiveSedeById(id));
    }

    @Override
    @Transactional
    public SedeResponse create(SedeRequest request) {
        Sede sede = Sede.builder()
                .name(request.name())
                .build();
        return toResponse(sedeRepository.save(sede));
    }

    @Override
    @Transactional
    public SedeResponse update(Long id, SedeRequest request) {
        Sede sede = findActiveSedeById(id);
        sede.setName(request.name());
        return toResponse(sedeRepository.save(sede));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Sede sede = findActiveSedeById(id);
        sede.softDelete();
        sedeRepository.save(sede);
    }

    private Sede findActiveSedeById(Long id) {
        return sedeRepository.findById(id)
                .filter(sede -> !Boolean.TRUE.equals(sede.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Sede no encontrada con ID: " + id));
    }

    private SedeResponse toResponse(Sede sede) {
        return new SedeResponse(sede.getId(), sede.getName());
    }
}
