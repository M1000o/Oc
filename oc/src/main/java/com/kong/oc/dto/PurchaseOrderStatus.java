package com.kong.oc.dto;

import jakarta.validation.constraints.NotNull;

public record PurchaseOrderStatus(

        @NotNull(message = "El status no puede ser nulo")
        Status status,

        String motivo
) { }
