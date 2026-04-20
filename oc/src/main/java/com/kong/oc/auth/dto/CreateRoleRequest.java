package com.kong.oc.auth.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Getter
@Setter
public class CreateRoleRequest {
    private String name;
    // Lista de ids de permisos
    private Set<Long> permissionIds;
}

