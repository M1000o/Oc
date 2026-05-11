package com.kong.oc.auth.listener;

import com.kong.oc.auth.event.ActivationEmailEvent;
import com.kong.oc.auth.service.EmailService;
import com.kong.oc.auth.util.ActivationFrontendUrlBuilder;
import com.kong.oc.common.exception.PurchaseOrderEmailDispatchException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class ActivationEmailListener {

    private final EmailService emailService;
    private final ActivationFrontendUrlBuilder frontendUrlBuilder;

    @Value("${app.activation.expiration-hours}")
    private int expirationHours;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onActivationEmailEvent(ActivationEmailEvent event) {
        try {
            String activationLink = frontendUrlBuilder.buildSetPasswordUrl(event.getActivationToken());
            log.info("Activation link base URL in use: {}", frontendUrlBuilder.getConfiguredBaseUrl());

            // Construir datos dinámicos para plantilla simple
            Map<String, Object> data = new HashMap<>();
            data.put("username", event.getUsername());
            data.put("activation_link", activationLink);
            data.put("expiry_hours", expirationHours);

            String html = buildHtml(activationLink, event.getUsername());

            // enviar via Gmail (JavaMailSender)
            emailService.sendActivationEmailTemplate(event.getEmail(), html, data);
            log.info("Activation email enqueued for userId={}", event.getUserId());
        } catch (PurchaseOrderEmailDispatchException e) {
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
