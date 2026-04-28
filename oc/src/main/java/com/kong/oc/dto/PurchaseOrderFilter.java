package com.kong.oc.dto;

import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;

public record PurchaseOrderFilter(

        Long supplierId,
        Status status,

        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate fechaDesde,

        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate fechaHasta,

        String sede,
        String area
) {}
