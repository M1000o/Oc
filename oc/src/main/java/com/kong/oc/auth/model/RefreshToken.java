package com.kong.oc.auth.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Getter
@Setter
@Table(
    name = "refresh_tokens",
    indexes = {
        @Index(name = "idx_token_hash_revoked", columnList = "tokenHash,revoked"),
        @Index(name = "idx_expires_at", columnList = "expiresAt" )
    }
)
public class RefreshToken {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 512)
    private String tokenHash;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private Instant expiresAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private boolean revoked;

    @PrePersist
    protected void onCreate(){
        createdAt = Instant.now();
    }
}
