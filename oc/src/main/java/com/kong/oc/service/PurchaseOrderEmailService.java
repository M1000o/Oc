package com.kong.oc.service;

import com.kong.oc.auth.service.EmailService;
import com.kong.oc.common.exception.PurchaseOrderRecipientException;
import com.kong.oc.dto.PurchaseOrderEmailRequest;
import com.kong.oc.dto.PurchaseOrderEmailResponse;
import com.kong.oc.dto.PurchaseOrderEmailStatus;
import com.kong.oc.model.Contacts;
import com.kong.oc.model.PurchaseOrder;
import com.kong.oc.model.Supplier;
import com.kong.oc.repository.ContactsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PurchaseOrderEmailService {

    private final ContactsRepository contactsRepository;
    private final EmailService emailService;
    private final PurchaseOrderDocumentService purchaseOrderDocumentService;

    public PurchaseOrderEmailResponse sendPurchaseOrderEmail(PurchaseOrder order, PurchaseOrderEmailRequest request) {
        String recipientEmail = resolveRecipientEmail(order.getSupplier());
        String subject = buildSubject(order);
        String htmlBody = buildEmailBody(order, request.message());
        PurchaseOrderDocumentService.PreparedPurchaseOrderPdf preparedPdf = purchaseOrderDocumentService.preparePdf(order);

        emailService.sendPurchaseOrderEmail(
                recipientEmail,
                subject,
                htmlBody,
                preparedPdf.content(),
                preparedPdf.fileName()
        );

        return new PurchaseOrderEmailResponse(
                order.getId(),
                order.getPurchaseOrderNumber(),
                recipientEmail,
                PurchaseOrderEmailStatus.ENVIADO_PROVEEDOR,
                LocalDateTime.now(),
                preparedPdf.fileName(),
                preparedPdf.filePath()
        );
    }

    private String resolveRecipientEmail(Supplier supplier) {
        Optional<String> contactEmail = contactsRepository
                .findFirstBySupplier_IdAndIsDeletedFalseOrderByIdAsc(supplier.getId())
                .map(Contacts::getEmail)
                .map(String::trim)
                .filter(email -> !email.isBlank());

        if (contactEmail.isPresent()) {
            return contactEmail.get();
        }

        String fallbackEmail = supplier.getCorreoConstancias();
        if (fallbackEmail != null && !fallbackEmail.trim().isBlank()) {
            return fallbackEmail.trim();
        }

        throw new PurchaseOrderRecipientException(
                "El proveedor no tiene un correo de contacto ni correo de constancias configurado."
        );
    }

    private String buildSubject(PurchaseOrder order) {
        return "OC " + order.getPurchaseOrderNumber() + " - Orden de compra";
    }

    private String buildEmailBody(PurchaseOrder order, String customMessage) {
        return """
                <html>
                  <body>
                    <p>%s</p>
                  </body>
                </html>
                """.formatted(escapeHtml(customMessage).replace("\n", "<br/>"));
    }

    private String escapeHtml(String value) {
        return value == null
                ? ""
                : value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
