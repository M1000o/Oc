package com.kong.oc.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;

public record ServicesRequest(
        @NotBlank(message = "El nombre del servicio es obligatorio")
        String nombre
) {
}

