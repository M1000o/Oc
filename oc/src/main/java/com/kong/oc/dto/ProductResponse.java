package com.kong.oc.dto;

import java.math.BigDecimal;

public record ProductResponse(
        Long id,
        String codigo_producto,
        String nombre,
        BigDecimal precio,
        Long proveedorId,
        String proveedorRuc,
        String proveedorName,
        String und_medida,
        Long servicioId,
        String servicioNombre
) {
}

