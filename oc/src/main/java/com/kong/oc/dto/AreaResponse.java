package com.kong.oc.dto;

public record AreaResponse(
        Long id,
        String nombre,
        Long sedeId,
        String sedeName
) {
}
