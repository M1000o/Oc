package com.kong.oc.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record PurchaseOrderDetailRequest(

        @NotNull(message = "El producto es obligatorio")
        Long productId,

        @NotNull(message = "La cantidad es obligatoria")
        @Positive(message = "La cantidad debe ser mayor que 0")
        Integer cantidad,

        @NotNull(message = "El precio unitario es obligatorio")
        @DecimalMin(value = "0.0", inclusive = false, message = "El precio unitario debe ser mayor a cero")
        @Digits(integer = 10, fraction = 2, message = "El precio unitario tiene un formato inválido")
        BigDecimal precioUnitario
) {
}
