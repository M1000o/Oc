package com.kong.oc.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record PurchaseOrderResponse(
        Long id,
        String purchaseOrderNumber,
        Long supplierId,
        String supplierRuc,
        String supplierName,
        LocalDate orderDate,
        LocalDate deliveryDate,
        String sede,
        String area,
        String status,
        String notas,
        String createdBy,
        BigDecimal subtotal,
        BigDecimal igv,
        BigDecimal total,
        List<PurchaseOrderDetailResponse> details
) {
}
