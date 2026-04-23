package com.kong.oc.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ProductRequest(
        @NotBlank(message = "El codigo del producto es obligatorio")
        @Size(min = 2, max = 30, message = "El codigo del producto debe tener entre 2 y 30 caracteres")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "El codigo del producto solo puede contener letras, numeros, guion y guion bajo")
        String codigo_producto,

        @NotBlank(message = "El nombre del producto es obligatorio")
        String nombre,
        String descripcion,
        @DecimalMin(value = "0.0", inclusive = false, message = "El precio debe ser mayor que 0")
        BigDecimal precio,

        @NotNull(message = "La unidad de medida es obligatoria")
        Unit und_medida,

        @NotNull(message = "El proveedor es obligatorio")
        Long proveedorId,
        @NotNull(message = "El servicio (categoria) es obligatorio")
        Long servicioId
) {
}

