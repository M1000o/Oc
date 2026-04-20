package com.kong.oc.dto;

import jakarta.validation.constraints.NotNull;

public record BankRequest(
        @NotNull(message = "El nombre del banco el obligatorio")
        String banco
) {
}
