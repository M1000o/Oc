package com.kong.oc.auth.dev;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Almacén en memoria para tokens en claro únicamente en perfil 'dev'.
 * NO usar en producción.
 */
@Component
@Profile("dev")
public class DevTokenStore {

    // map userId -> tokenPlain
    private final Map<Long, String> byUser = new ConcurrentHashMap<>();

    // opcional map tokenHash -> tokenPlain
    private final Map<String, String> byHash = new ConcurrentHashMap<>();

    public void storeForUser(Long userId, String tokenPlain) {
        if (userId != null && tokenPlain != null) byUser.put(userId, tokenPlain);
    }

    public void storeForHash(String tokenHash, String tokenPlain) {
        if (tokenHash != null && tokenPlain != null) byHash.put(tokenHash, tokenPlain);
    }

    public String getByUserId(Long userId) {
        return byUser.get(userId);
    }

    public String getByHash(String hash) { return byHash.get(hash); }
}

