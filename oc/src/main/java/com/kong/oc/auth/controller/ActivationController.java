package com.kong.oc.auth.controller;

import com.kong.oc.auth.service.ActivationService;
import com.kong.oc.auth.util.ActivationFrontendUrlBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Slf4j
public class ActivationController {

    private final ActivationService activationService;
    private final ActivationFrontendUrlBuilder frontendUrlBuilder;

    @GetMapping("/activate")
    public ResponseEntity<?> validate(@RequestParam String token) {
        try {
            // Si el token es válido, llevar al formulario de contraseña sin hash en URL.
            activationService.validateToken(token);
            String redirectUrl = frontendUrlBuilder.buildSetPasswordUrl(token);
            return buildRedirectResponse(redirectUrl);
        } catch (IllegalArgumentException e) {
            // Para enlaces usados/caducados/invalidos, mostrar una vista amigable en frontend.
            String reason = mapReason(e.getMessage());
            String redirectUrl = frontendUrlBuilder.buildActivationStatusUrl(reason, e.getMessage());
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

    @PostMapping({"/set-password", "/api/v1/auth/set-password"})
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
            } catch (DataAccessException ex) {
                // Se registra y se continúa devolviendo el error original de token al cliente.
                log.warn("No se pudo registrar intento fallido para token", ex);
            }
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
