package com.kong.oc.dto;

public record PurchaseOrderDetailResponse(
        Long id,
        String descripcion,
        Integer cantidad
) {
}

