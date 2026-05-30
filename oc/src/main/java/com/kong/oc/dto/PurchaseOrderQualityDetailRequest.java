package com.kong.oc.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PurchaseOrderQualityDetailRequest(
        @NotNull(message = "El detalle de la orden es obligatorio")
        Long purchaseOrderDetailId,

        @NotNull(message = "La cantidad aceptada es obligatoria")
        @Min(value = 0, message = "La cantidad aceptada no puede ser negativa")
        Integer acceptedQuantity,

        @NotNull(message = "La cantidad rechazada es obligatoria")
        @Min(value = 0, message = "La cantidad rechazada no puede ser negativa")
        Integer rejectedQuantity,

        @Size(max = 500, message = "La razón del producto no puede superar 500 caracteres")
        String motivo
) {
}
