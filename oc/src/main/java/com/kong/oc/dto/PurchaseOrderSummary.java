package com.kong.oc.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PurchaseOrderSummary(
        Long id,
        String purchaseOrderNumber,
        String supplierName,
        String clientName,
        LocalDate orderDate,
        LocalDate deliveryDate,
        Long sedeId,
        String sede,
        Long areaId,
        String area,
        String status,
        String emailStatus,
        String deliveryStatus,
        BigDecimal total
) {
}
