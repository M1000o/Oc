package com.kong.oc.auth.service;

import com.kong.oc.auth.model.RefreshToken;
import com.kong.oc.auth.model.User;
import com.kong.oc.auth.repository.RefreshTokenRepository;
import com.kong.oc.common.exception.AuthProcessingException;
import com.kong.oc.common.exception.TokenErrorType;
import com.kong.oc.common.exception.TokenException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class RefreshTokenService {

    private final RefreshTokenRepository repository;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public String createRefreshToken(User user) {
        String rawToken = generateSecureToken();
        String hash = hashToken(rawToken);

        RefreshToken token = new RefreshToken();
        token.setTokenHash(hash);
        token.setUser(user);
        token.setExpiresAt(
                Instant.now().plus(7, ChronoUnit.DAYS)
        );
        token.setRevoked(false);
        repository.save(token);
        log.debug("Refresh token creado para usuario: {}", user.getUsername());
        return rawToken;
    }

    @Transactional
    public RefreshToken validateAndRotate(String rawToken) {
        String hash = hashToken(rawToken);

        RefreshToken token = repository
                .findByTokenHashAndRevokedFalse(hash)
                .orElseThrow(() -> {
                    log.warn("Intento de uso de refresh token inválido o revocado");
                    return new TokenException("Refresh token inválido", TokenErrorType.INVALID_TOKEN);
                });
        if(token.isRevoked()){
            log.warn("Intento de uso de refresh token revocado para usuario: {}", token.getUser().getUsername());
            throw new TokenException("Refresh token revocado", TokenErrorType.REVOKED_TOKEN);
        }

        if (token.getExpiresAt().isBefore(Instant.now())) {
            log.warn("Intento de uso de refresh token expirado para usuario: {}", token.getUser().getUsername());
            throw new TokenException("Refresh token expirado", TokenErrorType.EXPIRED_TOKEN);
        }

        // Revocar el token antiguo (token rotation)
        token.setRevoked(true);
        repository.save(token);

        log.debug("Refresh token revocado para usuario: {}", token.getUser().getUsername());

        return token;
    }

    @Transactional
    public void revokeRefreshToken(String rawToken) {
        String hash = hashToken(rawToken);

        repository.findByTokenHashAndRevokedFalse(hash)
                .ifPresent(token -> {
                    token.setRevoked(true);
                    repository.save(token);
                    log.info("Refresh token revocado para usuario: {}", token.getUser().getUsername());
                });
    }

    @Transactional
    public void revokeAllUserTokens(User user) {
        repository.revokeAllUserTokens(user.getId());
        log.info("Todos los refresh tokens revocados para usuario: {}", user.getUsername());
    }

    /**
     * Limpieza automática de tokens expirados o revocados
     * Ejecuta cada día a las 3:00 AM
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanExpiredTokens() {
        log.info("Iniciando limpieza de tokens expirados...");
        int deleted = repository.deleteExpiredOrRevokedTokens(Instant.now());
        log.info("Tokens expirados/revocados eliminados: {}", deleted);
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[64];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes());
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            log.error("Error hasheando refresh token", e);
            throw new AuthProcessingException("Error hasheando refresh token", e);
        }
    }


}
