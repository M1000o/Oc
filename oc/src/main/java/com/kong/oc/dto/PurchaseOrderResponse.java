package com.kong.oc.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record PurchaseOrderResponse(
        Long id,
        String purchaseOrderNumber,
        Long supplierId,
        Long serviceId,
        List<Long> serviceIds,
        String status,
        LocalDate orderDate,
        LocalDate deliveryDate,
        String sede,
        String area,
        String notas,
        List<PurchaseOrderDetailResponse> details,
        LocalDateTime createdAt
) {
}
