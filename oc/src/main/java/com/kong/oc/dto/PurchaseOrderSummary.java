package com.kong.oc.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PurchaseOrderSummary(
        Long id,
        String purchaseOrderNumber,
        String supplierName,
        LocalDate orderDate,
        LocalDate deliveryDate,
        String sede,
        String area,
        String status,
        BigDecimal total
) {
}
