package com.kong.oc.auth.controller;

import com.kong.oc.auth.dto.CreateRoleRequest;
import com.kong.oc.auth.dto.PermissionDto;
import com.kong.oc.auth.dto.RoleDto;
import com.kong.oc.auth.model.Permission;
import com.kong.oc.auth.model.Role;
import com.kong.oc.auth.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
public class RoleController {
    private final RoleService roleService;

    @GetMapping
    public ResponseEntity<List<RoleDto>> list() {
        List<RoleDto> dtos = roleService.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping
    public ResponseEntity<RoleDto> create(@RequestBody CreateRoleRequest request) {
        Role created = roleService.create(request.getName(), request.getPermissionIds());
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(created));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoleDto> get(@PathVariable Long id) {
        Role r = roleService.findById(id);
        return ResponseEntity.ok(toDto(r));
    }

    private RoleDto toDto(Role r) {
        RoleDto dto = new RoleDto();
        dto.setId(r.getId());
        dto.setName(r.getName());
        Set<PermissionDto> perms = r.getPermissions().stream().map(p -> {
            PermissionDto pd = new PermissionDto();
            pd.setId(p.getId());
            pd.setName(p.getName());
            return pd;
        }).collect(Collectors.toSet());
        dto.setPermissions(perms);
        return dto;
    }
}
