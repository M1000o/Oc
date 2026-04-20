package com.kong.oc.auth.controller;

import com.kong.oc.auth.dev.DevTokenStore;
import com.kong.oc.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/dev/activation")
@RequiredArgsConstructor
@Profile("dev")
public class DevActivationController {

    private final DevTokenStore devTokenStore;
    private final UserRepository userRepository;

    @GetMapping("/token-by-email")
    public ResponseEntity<?> getTokenByEmail(@RequestParam String email) {
        return userRepository.findByUsername(email)
                .map(u -> {
                    String token = devTokenStore.getByUserId(u.getId());
                    if (token == null) return ResponseEntity.badRequest().body(Map.of("message", "No token stored for user (maybe it expired or was not created)"));
                    return ResponseEntity.ok(Map.of("token", token));
                }).orElse(ResponseEntity.badRequest().body(Map.of("message", "Usuario no encontrado")));
    }

    @GetMapping("/token-by-hash")
    public ResponseEntity<?> getTokenByHash(@RequestParam String hash) {
        String token = devTokenStore.getByHash(hash);
        if (token == null) return ResponseEntity.badRequest().body(Map.of("message", "No token stored for hash"));
        return ResponseEntity.ok(Map.of("token", token));
    }
}

