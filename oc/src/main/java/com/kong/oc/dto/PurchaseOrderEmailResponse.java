package com.kong.oc.dto;

import java.time.LocalDateTime;

public record PurchaseOrderEmailResponse(
        Long orderId,
        String purchaseOrderNumber,
        String recipientEmail,
        PurchaseOrderEmailStatus status,
        LocalDateTime sentAt,
        String pdfFileName,
        String pdfStoredPath
) {
}
