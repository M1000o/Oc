package com.kong.oc.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record PurchaseOrderRequest(

        String purchaseOrderNumber,

        Long servicioId,

        List<Long> servicioIds,

        @NotNull(message = "El proveedor es obligatorio")
        Long proveedorId,

        @NotNull(message = "La fecha de entrega es obligatoria")
        @FutureOrPresent(message = "La fecha de entrega no puede ser anterior a hoy")
        LocalDate fechaEntrega,

        @NotBlank(message = "El local es obligatorio")
        String local,

        @NotBlank(message = "El area es obligatoria")
        String area,

        Status status,

        @NotNull(message = "Los detalles de la orden son obligatorios")
        @Size(min = 1, message = "Los detalles de la orden no pueden estar vacios")
        @Valid
        List<PurchaseOrderDetailRequest> details,

        String notas

) { }
