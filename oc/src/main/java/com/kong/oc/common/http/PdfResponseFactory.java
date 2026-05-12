package com.kong.oc.common.http;

import com.kong.oc.common.exception.PurchaseOrderPdfException;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.nio.charset.StandardCharsets;

public final class PdfResponseFactory {

    private PdfResponseFactory() {
    }

    public static ResponseEntity<byte[]> attachment(String fileName, byte[] content) {
        return pdf(fileName, content, false);
    }

    public static ResponseEntity<byte[]> inline(String fileName, byte[] content) {
        return pdf(fileName, content, true);
    }

    private static ResponseEntity<byte[]> pdf(String fileName, byte[] content, boolean inline) {
        validate(content);

        ContentDisposition disposition = (inline
                ? ContentDisposition.inline()
                : ContentDisposition.attachment())
                .filename(resolveFileName(fileName), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(content.length)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(content);
    }

    private static void validate(byte[] content) {
        if (content == null || content.length == 0) {
            throw new PurchaseOrderPdfException("El PDF generado no contiene datos.");
        }
    }

    private static String resolveFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "purchase-order.pdf";
        }

        return fileName.trim();
    }
}
