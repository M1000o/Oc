package com.kong.oc.dto;

import jakarta.validation.constraints.NotNull;

public record BankResponse(
       Long id,
       String banco
) {
}
