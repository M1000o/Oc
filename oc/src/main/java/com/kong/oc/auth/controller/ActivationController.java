package com.kong.oc.auth.controller;

import com.kong.oc.auth.service.ActivationService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ActivationController {

    private final ActivationService activationService;

    @Value("${app.frontend-base-url}")
    private String frontendBaseUrl;

    @GetMapping("/activate")
    public ResponseEntity<?> validate(@RequestParam String token) {
        String base = frontendBaseUrl.replaceAll("/+$", "");
        String encodedToken = URLEncoder.encode(token, StandardCharsets.UTF_8);

        try {
            // Si el token es válido, llevar al formulario de contraseña sin hash en URL.
            activationService.validateToken(token);
            String redirectUrl = base + "/set-password?token=" + encodedToken;
            return buildRedirectResponse(redirectUrl);
        } catch (IllegalArgumentException e) {
            // Para enlaces usados/caducados/invalidos, mostrar una vista amigable en frontend.
            String reason = mapReason(e.getMessage());
            String encodedMessage = URLEncoder.encode(
                    e.getMessage() == null ? "Token inválido o expirado" : e.getMessage(),
                    StandardCharsets.UTF_8
            );
            String redirectUrl = base + "/activation-link-status?reason=" + reason + "&message=" + encodedMessage;
            return buildRedirectResponse(redirectUrl);
        }
    }

    private ResponseEntity<?> buildRedirectResponse(String redirectUrl) {
        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(redirectUrl));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    private String mapReason(String message) {
        if (message == null) {
            return "invalid";
        }

        String normalized = message.toLowerCase();
        if (normalized.contains("usado")) {
            return "used";
        }
        if (normalized.contains("expir")) {
            return "expired";
        }

        return "invalid";
    }

    @PostMapping("/set-password")
    public ResponseEntity<?> setPassword(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String newPassword = body.get("newPassword");
        if (token == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "token y newPassword son obligatorios"));
        }
        try {
            activationService.setPasswordAndActivate(token, newPassword);
            return ResponseEntity.ok(Map.of("message", "Contraseña establecida y usuario activado"));
        } catch (IllegalArgumentException e) {
            // registrar intento fallido para rate limiting
            try {
                activationService.registerFailedAttempt(token);
            } catch (Exception ex) {
                // ignore
            }
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
