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
        Long sedeId,
        String sede,
        Long areaId,
        String area,
        String status,
        String emailStatus,
        String deliveryStatus,
        String calidadStatus,
        String notas,
        String createdBy,
        BigDecimal subtotal,
        BigDecimal igv,
        BigDecimal total,
        List<PurchaseOrderDetailResponse> details
) {
}
