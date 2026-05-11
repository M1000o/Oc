package com.kong.oc.auth.util;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

@Component
@Slf4j
public class ActivationFrontendUrlBuilder {

    private final String frontendBaseUrl;
    private final Environment environment;

    public ActivationFrontendUrlBuilder(
            @Value("${app.frontend-base-url}") String frontendBaseUrl,
            Environment environment
    ) {
        this.frontendBaseUrl = frontendBaseUrl;
        this.environment = environment;
    }

    @PostConstruct
    void logConfiguredFrontendUrl() {
        String profiles = Arrays.toString(environment.getActiveProfiles());
        log.info("Activation frontend URL configured as: {} (active profiles: {})", frontendBaseUrl, profiles);
        if (environment.matchesProfiles("prod") && frontendBaseUrl.contains("localhost")) {
            log.warn("app.frontend-base-url apunta a localhost en perfil prod. Define APP_FRONTEND_BASE_URL con la URL pública del frontend.");
        }
    }

    public String buildSetPasswordUrl(String token) {
        String encodedToken = URLEncoder.encode(token, StandardCharsets.UTF_8);
        return baseUrl() + "/set-password?token=" + encodedToken;
    }

    public String buildActivationStatusUrl(String reason, String message) {
        String encodedReason = URLEncoder.encode(reason == null ? "invalid" : reason, StandardCharsets.UTF_8);
        String encodedMessage = URLEncoder.encode(
                message == null ? "Token inválido o expirado" : message,
                StandardCharsets.UTF_8
        );
        return baseUrl() + "/activation-link-status?reason=" + encodedReason + "&message=" + encodedMessage;
    }

    public String getConfiguredBaseUrl() {
        return baseUrl();
    }

    private String baseUrl() {
        return frontendBaseUrl.replaceAll("/+$", "");
    }
}

