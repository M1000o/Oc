package com.kong.oc.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AreaRequest(
    @NotBlank(message = "El nombre del área es obligatorio")
    @Size(max = 100, message = "El nombre del área no puede exceder los 100 caracteres")
    String nombre,

    @NotNull(message = "La sede es obligatoria")
    Long sedeId
) {
}
