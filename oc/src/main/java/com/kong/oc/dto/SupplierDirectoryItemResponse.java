package com.kong.oc.dto;

import java.util.List;

public record SupplierDirectoryItemResponse(
        Long id,
        String razonSocial,
        String ruc,
        String contactoNombre,
        String contactoEmail,
        String contactoTelefono,
        List<String> categorias,
        Long totalProductos,
        String estado
) {
}
