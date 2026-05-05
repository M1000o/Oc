package com.kong.oc.service;

import com.kong.oc.model.PurchaseOrder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PurchaseOrderDocumentService {

    private final PurchaseOrderPdfService purchaseOrderPdfService;
    private final PurchaseOrderPdfStorageService purchaseOrderPdfStorageService;

    public PreparedPurchaseOrderPdf preparePdf(PurchaseOrder order) {
        PurchaseOrderPdfService.GeneratedPdf generatedPdf = purchaseOrderPdfService.generate(order);
        PurchaseOrderPdfStorageService.StoredPdf storedPdf = purchaseOrderPdfStorageService.store(
                generatedPdf.fileName(),
                generatedPdf.content()
        );

        return new PreparedPurchaseOrderPdf(
                generatedPdf.fileName(),
                generatedPdf.content(),
                storedPdf.filePath()
        );
    }

    public record PreparedPurchaseOrderPdf(
            String fileName,
            byte[] content,
            String filePath
    ) {
    }
}
