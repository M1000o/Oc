package com.kong.oc.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UnitRequest(
        @NotBlank(message = "El codigo de la unidad es obligatorio")
        @Size(max = 20, message = "El codigo de la unidad no puede exceder los 20 caracteres")
        String codigo,

        @NotBlank(message = "El nombre de la unidad es obligatorio")
        @Size(max = 100, message = "El nombre de la unidad no puede exceder los 100 caracteres")
        String nombre
) {
}
