package com.kong.oc.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;

public record ProductRequest(
        @NotBlank(message = "El nombre del producto es obligatorio")
        String nombre,
        String descripcion,
        @DecimalMin(value = "0.0", inclusive = false, message = "El precio debe ser mayor que 0")
        BigDecimal precio,
        @NotNull(message = "El proveedor es obligatorio")
        Long proveedorId,
        @NotNull(message = "El servicio (categoria) es obligatorio")
        Long servicioId
) {
}

