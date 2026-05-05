package com.kong.oc.dto;

public record PurchaseOrderPdfDownload(
        String fileName,
        byte[] content
) {
}
