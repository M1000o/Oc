package com.kong.oc.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kong.oc.common.exception.PurchaseOrderEmailDispatchException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.email.from:erickva2512@gmail.com}")
    private String fromEmail;

    @Value("${app.activation.expiration-hours:24}")
    private int expirationHours;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public void sendActivationEmailPlain(String toEmail, String subject, String htmlContent) {
        sendHtmlEmail(toEmail, subject, htmlContent, "Error enviando email");
    }

    public void sendPurchaseOrderEmail(String toEmail, String subject, String htmlContent) {
        sendHtmlEmail(toEmail, subject, htmlContent, "No se pudo enviar el correo de la orden de compra");
    }

    public void sendPurchaseOrderEmail(
            String toEmail,
            String subject,
            String htmlContent,
            byte[] attachmentBytes,
            String attachmentFileName
    ) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "utf-8");
            helper.setText(htmlContent, true);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setFrom(fromEmail);
            helper.addAttachment(
                    attachmentFileName,
                    new ByteArrayResource(attachmentBytes),
                    "application/pdf"
            );
            mailSender.send(message);
            log.info("Email con adjunto enviado a {}", toEmail);
        } catch (MessagingException e) {
            log.error("Error enviando email con adjunto", e);
            throw new PurchaseOrderEmailDispatchException("No se pudo enviar el correo de la orden de compra", e);
        }
    }

    private void sendHtmlEmail(String toEmail, String subject, String htmlContent, String errorMessage) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "utf-8");
            helper.setText(htmlContent, true);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setFrom(fromEmail);
            mailSender.send(message);
            log.info("Email enviado a {}", toEmail);
        } catch (MessagingException e) {
            log.error("Error enviando email", e);
            throw new PurchaseOrderEmailDispatchException(errorMessage, e);
        }
    }

    public void sendActivationEmailTemplate(String toEmail, String templateHtml, Map<String, Object> dynamicData) {
        // Si usas plantillas locales, reemplaza variables simples
        String html = templateHtml;
        if (dynamicData != null) {
            for (Map.Entry<String, Object> e : dynamicData.entrySet()) {
                html = html.replace("{{" + e.getKey() + "}}", String.valueOf(e.getValue()));
            }
        }
        sendActivationEmailPlain(toEmail, "Activar cuenta", html);
    }
}
