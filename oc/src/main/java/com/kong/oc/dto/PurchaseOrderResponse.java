package com.kong.oc.dto;

import java.time.LocalDateTime;

public record PurchaseOrderResponse(
        Long id,
        Long supplierId,
        String status,
        LocalDateTime createdAt,
        String descripcion
) {
}

