package com.kong.oc.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record BulkServicesRequest(
        @NotEmpty(message = "La lista de servicios es obligatoria")
        List<@NotBlank(message = "El nombre del servicio no puede estar vacío") String> nombres
) {
}

