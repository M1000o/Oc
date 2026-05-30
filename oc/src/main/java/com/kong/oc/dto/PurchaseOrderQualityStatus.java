package com.kong.oc.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record PurchaseOrderQualityStatus(
        @NotNull(message = "El estado de calidad es obligatorio")
        CalidadStatus calidadStatus,

        @NotNull(message = "El estado de entrega resultante es obligatorio")
        DeliveryStatus deliveryStatus,

        @Size(max = 500, message = "La razón no puede superar 500 caracteres")
        String motivo,

        List<@Valid PurchaseOrderQualityDetailRequest> details
) {
}
