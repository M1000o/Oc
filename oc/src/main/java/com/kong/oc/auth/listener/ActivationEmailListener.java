package com.kong.oc.auth.listener;

import com.kong.oc.auth.event.ActivationEmailEvent;
import com.kong.oc.auth.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class ActivationEmailListener {

    private final EmailService emailService;

    @Value("${app.backend-base-url:http://localhost:8080}")
    private String backendBaseUrl;

    @Value("${app.activation.expiration-hours:24}")
    private int expirationHours;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onActivationEmailEvent(ActivationEmailEvent event) {
        try {
            String activationLink = String.format(
                "%s/activate?token=%s",
                backendBaseUrl.replaceAll("/+$", ""),
                URLEncoder.encode(event.getActivationToken(), StandardCharsets.UTF_8)
            );

            // Construir datos dinámicos para plantilla simple
            Map<String, Object> data = new HashMap<>();
            data.put("username", event.getUsername());
            data.put("activation_link", activationLink);
            data.put("expiry_hours", expirationHours);

            String html = buildHtml(activationLink, event.getUsername());

            // enviar via Gmail (JavaMailSender)
            emailService.sendActivationEmailTemplate(event.getEmail(), html, data);
            log.info("Activation email enqueued for userId={}", event.getUserId());
        } catch (Exception e) {
            log.error("Failed to send activation email for userId={}", event.getUserId(), e);
        }
    }

    private String buildHtml(String activationLink, String username) {
        return "<html><body>" +
                "<p>Hola " + username + ",</p>" +
                "<p>Gracias por registrarte. Para activar tu cuenta pulsa el siguiente enlace:</p>" +
                "<p><a href=\"" + activationLink + "\">Activar cuenta</a></p>" +
                "<p>El enlace expirará en " + expirationHours + " horas.</p>" +
                "</body></html>";
    }
}
