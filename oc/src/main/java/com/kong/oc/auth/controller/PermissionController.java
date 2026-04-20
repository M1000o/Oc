package com.kong.oc.auth.controller;

import com.kong.oc.auth.dto.CreatePermissionRequest;
import com.kong.oc.auth.dto.PermissionDto;
import com.kong.oc.auth.model.Permission;
import com.kong.oc.auth.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/permissions")
@RequiredArgsConstructor
public class PermissionController {
    private final PermissionService permissionService;

    @GetMapping
    public ResponseEntity<List<PermissionDto>> list() {
        List<PermissionDto> dtos = permissionService.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping
    public ResponseEntity<PermissionDto> create(@RequestBody CreatePermissionRequest request) {
        Permission p = new Permission();
        p.setName(request.getName());
        Permission created = permissionService.create(p);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(created));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PermissionDto> get(@PathVariable Long id) {
        Permission p = permissionService.findById(id);
        return ResponseEntity.ok(toDto(p));
    }

    private PermissionDto toDto(Permission p) {
        PermissionDto dto = new PermissionDto();
        dto.setId(p.getId());
        dto.setName(p.getName());
        return dto;
    }
}
