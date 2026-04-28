package com.kong.oc.dto;

import java.math.BigDecimal;

public record PurchaseOrderDetailResponse(
        Long id,
        Long productoId,
        String codigoProducto,
        String nombreProducto,
        String unidadMedida,
        Integer cantidad,
        BigDecimal precioUnitario,
        BigDecimal subtotal
) {
}

