package com.kong.oc.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PurchaseOrderCompanyConfigurationRequest(
        @NotBlank(message = "La razón social es obligatoria")
        @Size(max = 180, message = "La razón social no puede superar 180 caracteres")
        String companyName,

        @NotBlank(message = "El RUC es obligatorio")
        @Pattern(regexp = "\\d{11}", message = "El RUC debe tener 11 dígitos")
        String companyRuc,

        @NotBlank(message = "La dirección fiscal es obligatoria")
        @Size(max = 280, message = "La dirección fiscal no puede superar 280 caracteres")
        String companyAddress
) {
}
