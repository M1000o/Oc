package com.kong.oc.service;

import com.kong.oc.common.exception.PurchaseOrderPdfException;
import com.kong.oc.dto.PurchaseOrderCompanyConfigurationResponse;
import com.kong.oc.model.Contacts;
import com.kong.oc.model.PurchaseOrder;
import com.kong.oc.model.PurchaseOrderDetail;
import com.kong.oc.model.Supplier;
import com.kong.oc.repository.ContactsRepository;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import com.openhtmltopdf.svgsupport.BatikSVGDrawer;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PurchaseOrderPdfService {

    private static final DateTimeFormatter FILE_TIMESTAMP_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final DateTimeFormatter DISPLAY_DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Locale PERU_LOCALE = Locale.forLanguageTag("es-PE");
    private static final String TEMPLATE_PATH = "templates/purchase-order-pdf-template.html";

    private final ContactsRepository contactsRepository;
    private final PurchaseOrderCompanyConfigurationService companyConfigurationService;

    @Value("${app.purchase-order.pdf.generated-by}")
    private String generatedBy;

    public GeneratedPdf generate(PurchaseOrder order) {
        String fileName = buildUniqueFileName(order.getPurchaseOrderNumber());

        try {
            String html = renderTemplate(order);
            byte[] pdfBytes = renderPdf(html);
            return new GeneratedPdf(fileName, pdfBytes);
        } catch (IOException ex) {
            throw new PurchaseOrderPdfException("No se pudo generar el PDF de la orden de compra.");
        }
    }

    private String renderTemplate(PurchaseOrder order) throws IOException {
        String template = loadTemplate();
        Supplier supplier = order.getSupplier();
        Contacts primaryContact = contactsRepository
                .findFirstBySupplier_IdAndIsDeletedFalseOrderByIdAsc(supplier.getId())
                .orElse(null);
        PurchaseOrderCompanyConfigurationResponse companyConfiguration =
                companyConfigurationService.resolveForPdf();

        Map<String, String> values = new LinkedHashMap<>();
        values.put("companyName", escapeHtml(companyConfiguration.companyName()));
        values.put("companyRuc", escapeHtml(companyConfiguration.companyRuc()));
        values.put("companyAddress", escapeHtml(companyConfiguration.companyAddress()));
        values.put("documentNumber", escapeHtml(order.getPurchaseOrderNumber()));
        values.put("issueDate", formatDate(order.getOrderDate()));
        values.put("supplierName", escapeHtml(supplier.getRazonSocial()));
        values.put("supplierRuc", escapeHtml(supplier.getRuc()));
        values.put("supplierContact", escapeHtml(resolveContactName(primaryContact)));
        values.put("supplierEmail", escapeHtml(resolveSupplierEmail(primaryContact, supplier)));
        values.put("deliverySite", escapeHtml(defaultText(order.getArea().getSede().getName(), "No registrado")));
        values.put("deliveryArea", escapeHtml(defaultText(order.getArea().getNombre(), "No registrado")));
        values.put("requiredDate", formatNullableDate(order.getDeliveryDate()));
        values.put("paymentTerms", escapeHtml(resolvePaymentTerms(supplier)));
        values.put("currencyLabel", "Soles (PEN)");
        values.put("subtotal", escapeHtml(formatCurrency(order.getSubtotal())));
        values.put("igv", escapeHtml(formatCurrency(order.getIgv())));
        values.put("total", escapeHtml(formatCurrency(order.getTotal())));
        values.put("notes", escapeHtml(resolveNotes(order)));
        values.put("generatedBy", escapeHtml(generatedBy));
        values.put("lineItemsRows", buildLineItemsRows(order));

        String html = template;
        for (Map.Entry<String, String> entry : values.entrySet()) {
            html = html.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }

        return html;
    }

    private byte[] renderPdf(String html) throws IOException {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.useSVGDrawer(new BatikSVGDrawer());
            builder.withHtmlContent(html, null);
            builder.toStream(outputStream);
            builder.run();
            return outputStream.toByteArray();
        } catch (Exception ex) {
            throw new PurchaseOrderPdfException("No se pudo renderizar el PDF de la orden de compra.");
        }
    }

    private String loadTemplate() throws IOException {
        ClassPathResource resource = new ClassPathResource(TEMPLATE_PATH);
        try (InputStream inputStream = resource.getInputStream()) {
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private String buildLineItemsRows(PurchaseOrder order) {
        StringBuilder rows = new StringBuilder();
        int index = 1;

        for (PurchaseOrderDetail detail : order.getDetails()) {
            rows.append("<tr>")
                    .append("<td>").append(index).append("</td>")
                    .append("<td class=\"mono\">").append(escapeHtml(defaultText(detail.getProduct().getCodigoProducto(), "-"))).append("</td>")
                    .append("<td class=\"description\">").append(escapeHtml(defaultText(detail.getProduct().getNombre(), "Sin descripcion"))).append("</td>")
                    .append("<td>").append(escapeHtml(detail.getProduct().getUnd_medida().name())).append("</td>")
                    .append("<td class=\"align-center\">").append(detail.getCantidad()).append("</td>")
                    .append("<td class=\"align-right\">").append(escapeHtml(formatCurrency(detail.getPrecioUnitario()))).append("</td>")
                    .append("<td class=\"align-right strong\">").append(escapeHtml(formatCurrency(detail.getSubtotal()))).append("</td>")
                    .append("</tr>");
            index++;
        }

        return rows.toString();
    }

    private String buildUniqueFileName(String purchaseOrderNumber) {
        return sanitizeForFileName(purchaseOrderNumber)
                + "-"
                + LocalDateTime.now().format(FILE_TIMESTAMP_FORMATTER)
                + "-"
                + UUID.randomUUID().toString().substring(0, 8)
                + ".pdf";
    }

    private String resolveContactName(Contacts primaryContact) {
        if (primaryContact == null) {
            return "No registrado";
        }

        String fullName = String.join(" ",
                defaultText(primaryContact.getName(), ""),
                defaultText(primaryContact.getApellido_paterno(), ""),
                defaultText(primaryContact.getApellido_materno(), ""))
                .replaceAll("\\s+", " ")
                .trim();

        return fullName.isBlank() ? "No registrado" : fullName;
    }

    private String resolveSupplierEmail(Contacts primaryContact, Supplier supplier) {
        if (primaryContact != null && primaryContact.getEmail() != null && !primaryContact.getEmail().isBlank()) {
            return primaryContact.getEmail().trim();
        }

        if (supplier.getCorreoConstancias() != null && !supplier.getCorreoConstancias().isBlank()) {
            return supplier.getCorreoConstancias().trim();
        }

        return "No registrado";
    }

    private String resolvePaymentTerms(Supplier supplier) {
        if (supplier.getCreditDays() == null) {
            return "No configurado";
        }

        return "Credito " + supplier.getCreditDays().getDays() + " dias";
    }

    private String resolveNotes(PurchaseOrder order) {
        return defaultText(order.getNotas(), "Sin observaciones registradas.");
    }

    private String resolveGeneratedBy(PurchaseOrder order) {
        return generatedBy;
    }

    private String formatDate(java.time.LocalDate date) {
        return date.format(DISPLAY_DATE_FORMATTER);
    }

    private String formatNullableDate(java.time.LocalDate date) {
        return date == null ? "No registrada" : formatDate(date);
    }

    private String formatCurrency(BigDecimal value) {
        NumberFormat formatter = NumberFormat.getCurrencyInstance(PERU_LOCALE);
        return formatter.format(value);
    }

    private String sanitizeForFileName(String value) {
        return defaultText(value, "purchase-order").replaceAll("[^A-Za-z0-9_-]", "_");
    }

    private String defaultText(String value, String fallback) {
        return Optional.ofNullable(value)
                .map(String::trim)
                .filter(text -> !text.isBlank())
                .orElse(fallback);
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

    public record GeneratedPdf(
            String fileName,
            byte[] content
    ) {
    }
}
