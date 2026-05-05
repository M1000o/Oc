package com.kong.oc.auth;

import com.kong.oc.auth.dto.LoginRequest;
import com.kong.oc.auth.dto.TokenResponse;
import com.kong.oc.auth.repository.UserRepository;
import com.kong.oc.auth.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class AuthIntegrationTest {

    @Autowired
    AuthService authService;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Test
    void authenticate_admin_user() {
        var opt = userRepository.findByUsernameIgnoreCase("admin");
        assertTrue(opt.isPresent(), "admin user must exist");

        var user = opt.get();
        String raw = "Admin123!";
        assertTrue(passwordEncoder.matches(raw, user.getPassword()), "PasswordEncoder should match raw password with stored hash");

        LoginRequest request = new LoginRequest();
        request.setUsername("  ADMIN  ");
        request.setPassword(raw);

        TokenResponse tokenResponse = authService.login(request);
        assertNotNull(tokenResponse.getAccessToken());
        assertNotNull(tokenResponse.getRefreshToken());
    }
}
