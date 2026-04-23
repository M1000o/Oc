package com.kong.oc.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record PurchaseOrderDetailRequest(
        @NotBlank(message = "La descripcion del detalle es obligatoria")
        String descripcion,

        @Positive(message = "La cantidad debe ser mayor que 0")
        Integer cantidad
) {
}
