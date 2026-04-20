package com.kong.oc.auth.service;

import com.kong.oc.auth.event.ActivationEmailEvent;
import com.kong.oc.auth.model.ActivationToken;
import com.kong.oc.auth.model.User;
import com.kong.oc.auth.repository.ActivationTokenRepository;
import com.kong.oc.auth.repository.UserRepository;
import com.kong.oc.auth.util.TokenUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivationResendService {

    private final UserRepository userRepository;
    private final ActivationTokenRepository tokenRepository;
    private final ApplicationEventPublisher eventPublisher;

    // cooldown entre reenvíos en minutos
    private final long RESEND_COOLDOWN_MINUTES = 10;

    @Transactional
    public void resendActivation(String email) {
        User user = userRepository.findByUsername(email)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado para email"));

        // Verificar si el usuario ya está activo
        if (user.isEnabled()) {
            throw new IllegalArgumentException("Usuario ya activado");
        }

        // Obtener último token
        ActivationToken last = tokenRepository.findTopByUserOrderByCreatedAtDesc(user).orElse(null);
        if (last != null && !last.isUsed()) {
            Duration since = Duration.between(last.getCreatedAt(), LocalDateTime.now());
            if (since.toMinutes() < RESEND_COOLDOWN_MINUTES) {
                throw new IllegalArgumentException("Solicitudes de reenvío muy frecuentes. Intente más tarde.");
            }
        }

        // marcar tokens previos como usados
        List<ActivationToken> pending = tokenRepository.findByUserAndUsedFalse(user);
        for (ActivationToken t : pending) {
            t.setUsed(true);
            tokenRepository.save(t);
        }

        // crear nuevo token (hash) y publicar evento
        String tokenPlain = UUID.randomUUID().toString();
        String tokenHash = TokenUtils.sha256Hex(tokenPlain);
        ActivationToken at = ActivationToken.builder()
                .tokenHash(tokenHash)
                .user(user)
                .createdAt(LocalDateTime.now())
                .expiryDate(LocalDateTime.now().plusHours(24))
                .used(false)
                .attempts(0)
                .build();
        tokenRepository.save(at);

        eventPublisher.publishEvent(new ActivationEmailEvent(this, user.getId(), email, tokenPlain, user.getUsername()));
        log.info("Reenvío de token creado para userId={}", user.getId());
    }
}
