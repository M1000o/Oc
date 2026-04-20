package com.kong.oc.auth.service;

import com.kong.oc.auth.model.Permission;
import com.kong.oc.auth.model.Role;
import com.kong.oc.auth.repository.RoleRepository;
import com.kong.oc.auth.repository.PermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoleService {
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    public List<Role> findAll() {
        return roleRepository.findAll();
    }

    public Role findById(Long id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Rol no encontrado con id: " + id));
    }

    @Transactional
    public Role create(Role role) {
        // Aseguramos permisos persistidos (se asume que se reciben Permission con id o nombre)
        return roleRepository.save(role);
    }

    @Transactional
    public Role create(String name, Set<Long> permissionIds) {
        Role role = new Role();
        role.setName(name);
        if (permissionIds != null && !permissionIds.isEmpty()) {
            Set<Permission> perms = permissionIds.stream()
                    .map(id -> permissionRepository.findById(id)
                            .orElseThrow(() -> new IllegalArgumentException("Permiso no encontrado con id: " + id)))
                    .collect(Collectors.toSet());
            role.setPermissions(perms);
        }
        return roleRepository.save(role);
    }
}
