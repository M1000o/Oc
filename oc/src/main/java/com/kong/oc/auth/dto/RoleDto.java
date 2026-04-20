package com.kong.oc.auth.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Getter
@Setter
public class RoleDto {
    private Long id;
    private String name;
    private Set<PermissionDto> permissions;
}

