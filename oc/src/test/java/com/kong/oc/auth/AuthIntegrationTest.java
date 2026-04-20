package com.kong.oc.auth;

import com.kong.oc.auth.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class AuthIntegrationTest {

    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Test
    void authenticate_admin_user() {
        var opt = userRepository.findByUsernameWithRolesAndPermissions("admin");
        assertTrue(opt.isPresent(), "admin user must exist");
        var user = opt.get();
        String raw = "Admin123!";
        System.out.println("passwordHash=" + user.getPassword());
        assertTrue(passwordEncoder.matches(raw, user.getPassword()), "PasswordEncoder should match raw password with stored hash");

        Authentication auth = new UsernamePasswordAuthenticationToken("admin", raw);
        Authentication result = authenticationManager.authenticate(auth);
        assertNotNull(result);
        assertTrue(result.isAuthenticated());
    }
}
