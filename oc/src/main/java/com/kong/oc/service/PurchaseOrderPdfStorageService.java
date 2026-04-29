package com.kong.oc.service;

import com.kong.oc.common.exception.PurchaseOrderPdfException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
@RequiredArgsConstructor
public class PurchaseOrderPdfStorageService {

    @Value("${app.purchase-order.pdf.storage-path:purchase-order-pdfs}")
    private String storagePath;

    public StoredPdf store(String fileName, byte[] pdfBytes) {
        try {
            Path basePath = Paths.get(storagePath).toAbsolutePath().normalize();
            Files.createDirectories(basePath);

            Path filePath = basePath.resolve(fileName).normalize();
            Files.write(filePath, pdfBytes);

            return new StoredPdf(fileName, filePath.toString());
        } catch (IOException ex) {
            throw new PurchaseOrderPdfException("No se pudo guardar el PDF de la orden de compra.");
        }
    }

    public record StoredPdf(
            String fileName,
            String filePath
    ) {
    }
}
