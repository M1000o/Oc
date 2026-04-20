package com.kong.oc.auth.service;

import com.kong.oc.auth.dev.DevTokenStore;
import com.kong.oc.auth.model.ActivationToken;
import com.kong.oc.auth.model.User;
import com.kong.oc.auth.repository.ActivationTokenRepository;
import com.kong.oc.auth.repository.UserRepository;
import com.kong.oc.auth.util.TokenUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivationService {

    private final ActivationTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final PasswordEncoder passwordEncoder;
    private final DevTokenStore devTokenStore; // in dev profile bean exists

    private final long EXPIRATION_HOURS = 24;
    private final int MAX_ATTEMPTS = 5;

    @Transactional
    public ActivationToken createActivationForUser(User user, String email) {
        String tokenPlain = UUID.randomUUID().toString();
        String tokenHash = TokenUtils.sha256Hex(tokenPlain);
        ActivationToken at = ActivationToken.builder()
                .tokenHash(tokenHash)
                .user(user)
                .createdAt(LocalDateTime.now())
                .expiryDate(LocalDateTime.now().plusHours(EXPIRATION_HOURS))
                .used(false)
                .attempts(0)
                .build();
        at = tokenRepository.save(at);
        // store plain token in dev store for convenience
        try { devTokenStore.storeForUser(user.getId(), tokenPlain); devTokenStore.storeForHash(tokenHash, tokenPlain); } catch(Exception ignored) {}
        // publicar evento para envío asíncrono con token en claro (solo via email)
        eventPublisher.publishEvent(new com.kong.oc.auth.event.ActivationEmailEvent(this, user.getId(), email, tokenPlain, user.getUsername()));
        log.info("Created activation token for userId={}", user.getId());
        log.debug("Activation token (dev): {} for userId={} - link: https://miapp.com/activate?token={}", tokenPlain, user.getId(), tokenPlain);
        return at;
    }

    @Transactional(readOnly = true)
    public ActivationToken validateToken(String token) {
        String tokenHash = TokenUtils.sha256Hex(token);
        ActivationToken at = tokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("Token inválido"));
        if (at.isUsed()) {
            throw new IllegalArgumentException("Token ya usado");
        }
        if (at.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Token expirado");
        }
        return at;
    }

    @Transactional
    public void setPasswordAndActivate(String token, String rawPassword) {
        String tokenHash = TokenUtils.sha256Hex(token);
        ActivationToken at = tokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("Token inválido"));

        if (at.isUsed()) throw new IllegalArgumentException("Token ya usado");
        if (at.getExpiryDate().isBefore(LocalDateTime.now())) throw new IllegalArgumentException("Token expirado");

        if (at.getAttempts() >= MAX_ATTEMPTS) throw new IllegalArgumentException("Máximo de intentos alcanzado");

        User user = at.getUser();
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setEnabled(true);
        user.setRequiresPasswordChange(false);
        userRepository.save(user);

        at.setUsed(true);
        tokenRepository.save(at);

        log.info("User activated and password set for userId={}", user.getId());
    }

    @Transactional
    public void registerFailedAttempt(String token) {
        String tokenHash = TokenUtils.sha256Hex(token);
        tokenRepository.findByTokenHash(tokenHash).ifPresent(at -> {
            at.setAttempts(at.getAttempts() + 1);
            tokenRepository.save(at);
        });
    }
}
