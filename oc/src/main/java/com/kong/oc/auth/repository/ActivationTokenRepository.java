package com.kong.oc.auth.repository;

import com.kong.oc.auth.model.ActivationToken;
import com.kong.oc.auth.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ActivationTokenRepository extends JpaRepository<ActivationToken, Long> {
    Optional<ActivationToken> findByTokenHash(String tokenHash);
    Optional<ActivationToken> findTopByUserOrderByCreatedAtDesc(User user);
    List<ActivationToken> findByUserAndUsedFalse(User user);
}
