package com.kong.oc.dto;

import java.math.BigDecimal;

public record ProductResponse(
        Long id,
        String nombre,
        BigDecimal precio,
        Long proveedorId,
        String proveedorRuc,
        Long servicioId,
        String servicioNombre
) {
}

