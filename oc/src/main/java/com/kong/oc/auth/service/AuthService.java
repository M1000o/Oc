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

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenService jwtTokenService;
    private final RefreshTokenService refreshTokenService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;


    public TokenResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );

            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            log.info("Login exitoso para usuario: {}", request.getUsername());

            try {
                return generateTokenResponse(userDetails.getUser());
            } catch (Exception e) {
                log.error("Error generando tokens para usuario {}: {}", request.getUsername(), e.getMessage(), e);
                throw new IllegalStateException("Error generando tokens para el usuario", e);
            }

        } catch (BadCredentialsException e) {
            log.warn("Intento de login fallido para usuario: {}", request.getUsername());
            throw e;
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
                user.getUsername(),
                user.getId().toString(),
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
        // Validar que el usuario no exista
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            log.warn("Intento de registro con username ya existente: {}", request.getUsername());
            throw new IllegalArgumentException("El username ya está en uso");
        }

        // Crear nuevo usuario
        User user = new User();
        user.setUsername(request.getUsername());
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

        // Generar tokens
        try {
            return generateTokenResponse(user);
        } catch (Exception e) {
            log.error("Error generando tokens para usuario registrado {}: {}", user.getUsername(), e.getMessage(), e);
            throw new IllegalStateException("Error generando tokens al registrar usuario", e);
        }
    }

    @Transactional
    public void logout(String refreshToken) {
        try {
            refreshTokenService.revokeRefreshToken(refreshToken);
            log.info("Logout exitoso - refresh token revocado");
        } catch (Exception e) {
            log.warn("Error al revocar refresh token durante logout: {}", e.getMessage());
            // No lanzamos excepción para que el logout siempre sea exitoso del lado del cliente
        }
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
                user.getUsername(),
                user.getId().toString(),
                roles,
                permissions
        );
        String refreshToken = refreshTokenService.createRefreshToken(user);

        return new TokenResponse(accessToken, refreshToken);
    }

}
