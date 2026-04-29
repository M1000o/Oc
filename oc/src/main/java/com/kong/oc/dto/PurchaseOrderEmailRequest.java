package com.kong.oc.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PurchaseOrderEmailRequest(

        @NotBlank(message = "El mensaje personalizado es obligatorio")
        @Size(max = 1000, message = "El mensaje personalizado no puede superar 1000 caracteres")
        String message

) {
}
