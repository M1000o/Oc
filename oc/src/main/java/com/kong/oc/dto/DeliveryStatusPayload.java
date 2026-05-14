package com.kong.oc.dto;

import jakarta.validation.constraints.NotNull;

public record DeliveryStatusPayload(
    @NotNull(message = "El estado de entrega es obligatorio")
    DeliveryStatus deliveryStatus,
    String notas
) {
}
