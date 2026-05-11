package com.kong.oc.auth.controller;

import com.kong.oc.auth.service.ActivationResendService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ActivationResendController {

    private final ActivationResendService resendService;

    @PostMapping({"/activation/resend", "/api/v1/auth/activation/resend"})
    public ResponseEntity<?> resend(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "email es obligatorio"));
        }
        try {
            resendService.resendActivation(email);
            return ResponseEntity.ok(Map.of("message", "Email de activación reenviado"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}

