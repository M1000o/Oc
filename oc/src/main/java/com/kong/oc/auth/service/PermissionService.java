package com.kong.oc.auth.service;

import com.kong.oc.auth.model.Permission;
import com.kong.oc.auth.repository.PermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PermissionService {
    private final PermissionRepository permissionRepository;

    public List<Permission> findAll() {
        return permissionRepository.findAll();
    }

    public Permission findById(Long id) {
        return permissionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Permiso no encontrado con id: " + id));
    }

    @Transactional
    public Permission create(Permission permission) {
        return permissionRepository.save(permission);
    }
}

