package com.kong.oc.auth.service;

import com.kong.oc.auth.dto.LoginRequest;
import com.kong.oc.auth.dto.RegisterRequest;
import com.kong.oc.auth.dto.TokenResponse;
import com.kong.oc.auth.model.Permission;
import com.kong.oc.auth.model.RefreshToken;
import com.kong.oc.auth.model.Role;
import com.kong.oc.auth.model.User;
import com.kong.oc.auth.repository.RoleRepository;
import com.kong.oc.auth.repository.UserRepository;
import com.kong.oc.common.exception.AuthProcessingException;
import com.kong.oc.interfaces.IAuthService;
import com.kong.oc.security.UserDetailsImpl;
import com.kong.oc.security.jwt.JwtTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService implements IAuthService{

    private final AuthenticationManager authenticationManager;
    private final JwtTokenService jwtTokenService;
    private final RefreshTokenService refreshTokenService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;


    public TokenResponse login(LoginRequest request) {
        String normalizedUsername = normalizeUsername(request.getUsername());
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            normalizedUsername,
                            request.getPassword()
                    )
            );

            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            log.info("Login exitoso para usuario: {}", normalizedUsername);
            return generateTokenResponse(userDetails.getUser());

        } catch (BadCredentialsException e) {
            log.warn("Intento de login fallido para usuario: {}", normalizedUsername);
            throw e;
        } catch (RuntimeException e) {
            log.error("Error generando tokens para usuario {}: {}", normalizedUsername, e.getMessage(), e);
            throw new AuthProcessingException("Error generando tokens para el usuario", e);
        }
    }

    @Transactional
    public TokenResponse refresh(String refreshToken) {
        RefreshToken odlToken = refreshTokenService.validateAndRotate(refreshToken);
        User user = odlToken.getUser();

        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .toList();

        List<String> permissions = user.getRoles().stream()
                .flatMap(r -> r.getPermissions().stream())
                .map(Permission::getName)
                .distinct()
                .toList();

        String newAccessToken = jwtTokenService.generateAccessToken(
                user.getId().toString(),
                user.getUsername(),
                roles,
                permissions
        );

        String newRefreshToken = refreshTokenService.createRefreshToken(user);

        return new TokenResponse(
                newAccessToken,
                newRefreshToken
        );
    }

    @Transactional
    public TokenResponse register(RegisterRequest request) {
        String normalizedUsername = normalizeUsername(request.getUsername());

        // Validar que el usuario no exista
        if (userRepository.findByUsernameIgnoreCase(normalizedUsername).isPresent()) {
            log.warn("Intento de registro con username ya existente: {}", normalizedUsername);
            throw new IllegalArgumentException("El username ya está en uso");
        }

        // Crear nuevo usuario
        User user = new User();
        user.setUsername(normalizedUsername);
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        // Asignar rol (por defecto rol con ID 1 si no se especifica)
        Long roleId = request.getRoleId() != null ? request.getRoleId() : 1L;

        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> {
                    log.warn("Intento de registro con rol inexistente: {}", roleId);
                    return new IllegalArgumentException("El rol con ID " + roleId + " no existe");
                });

        user.getRoles().add(role);
        user.setEnabled(true);

        // Guardar usuario
        user = userRepository.save(user);
        log.info("Usuario registrado exitosamente: {} con rol: {}", user.getUsername(), role.getName());

        try {
            return generateTokenResponse(user);
        } catch (RuntimeException e) {
            log.error("Error generando tokens para usuario registrado {}: {}", user.getUsername(), e.getMessage(), e);
            throw new AuthProcessingException("Error generando tokens al registrar usuario", e);
        }
    }

    @Transactional
    public void logout(String refreshToken) {
        refreshTokenService.revokeRefreshToken(refreshToken);
        log.info("Logout exitoso - refresh token revocado");
    }

    private TokenResponse generateTokenResponse(User user) {
        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .toList();

        List<String> permissions = user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(Permission::getName)
                .distinct()
                .toList();

        String accessToken = jwtTokenService.generateAccessToken(
                user.getId().toString(),
                user.getUsername(),
                roles,
                permissions
        );
        String refreshToken = refreshTokenService.createRefreshToken(user);

        return new TokenResponse(accessToken, refreshToken);
    }

    private String normalizeUsername(String username) {
        return username == null ? null : username.trim().toLowerCase(Locale.ROOT);
    }

}
