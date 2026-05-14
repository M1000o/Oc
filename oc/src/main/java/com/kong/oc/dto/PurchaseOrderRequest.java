package com.kong.oc.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.util.List;

public record PurchaseOrderRequest(

        @NotNull(message = "El proveedor es obligatorio")
        Long supplierId,

        @NotNull(message = "La fecha de la orden es obligatoria")
        LocalDate orderDate,

        @NotNull(message = "La fecha de entrega es obligatoria")
        @FutureOrPresent(message = "La fecha de entrega no puede ser anterior a hoy")
        LocalDate deliveryDate,

        @NotNull(message = "El area es obligatoria")
        Long areaId,

        Boolean saveDraft,

        @NotEmpty(message = "La orden debe tener al menos un detalle")
        @Valid
        List<PurchaseOrderDetailRequest> details,

        @Size(max = 500, message = "Las notas no pueden superar 500 caracteres")
        String notas

) { }
