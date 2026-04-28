package com.kong.oc.dto;

import java.time.LocalDateTime;
import java.util.List;

public record SupplierDirectoryDetailResponse(
        Long id,
        String razonSocial,
        String ruc,
        Integer diasCredito,
        String diasCreditoLabel,
        boolean tieneCuentaDetraccion,
        String cuentaDetraccion,
        String correoConstancias,
        String contactoNombre,
        String contactoEmail,
        String contactoTelefono,
        List<String> categorias,
        Long totalProductos,
        String estado,
        LocalDateTime fechaRegistro
) {
}
