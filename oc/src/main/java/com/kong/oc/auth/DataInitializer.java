package com.kong.oc.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.kong.oc.auth.model.Permission;
import com.kong.oc.auth.model.Role;
import com.kong.oc.auth.model.User;
import com.kong.oc.auth.repository.PermissionRepository;
import com.kong.oc.auth.repository.RoleRepository;
import com.kong.oc.auth.repository.UserRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        ClassPathResource resource = new ClassPathResource("data.yml");
        if (!resource.exists()) {
            log.info("No data.yml found, skipping initialization");
            return;
        }

        ObjectMapper mapper = new ObjectMapper(new YAMLFactory());
        DataSpec spec = mapper.readValue(resource.getInputStream(), DataSpec.class);

        // Crear permisos
        Map<String, Permission> createdPermissions = new HashMap<>();
        if (spec.permissions != null) {
            for (String pname : spec.permissions) {
                Permission p = permissionRepository.findByName(pname).orElseGet(() -> {
                    Permission np = new Permission();
                    np.setName(pname);
                    return permissionRepository.save(np);
                });
                createdPermissions.put(p.getName(), p);
            }
        }

        // Crear roles
        Map<String, Role> createdRoles = new HashMap<>();
        if (spec.roles != null) {
            for (RoleSpec r : spec.roles) {
                Role role = roleRepository.findAll().stream()
                        .filter(rr -> rr.getName().equals(r.name))
                        .findFirst()
                        .orElseGet(() -> {
                            Role nr = new Role();
                            nr.setName(r.name);
                            return nr;
                        });
                if (r.permissions != null && !r.permissions.isEmpty()) {
                    Set<Permission> perms = r.permissions.stream()
                            .map(createdPermissions::get)
                            .filter(Objects::nonNull)
                            .collect(Collectors.toSet());
                    role.setPermissions(perms);
                }
                role = roleRepository.save(role);
                createdRoles.put(role.getName(), role);
            }
        }

        // Crear admin
        if (spec.admin != null) {
            String username = resolveSeedValue(spec.admin.username, "admin").trim().toLowerCase(Locale.ROOT);
            String rawPassword = resolveSeedValue(spec.admin.password, "Admin123!");
            String roleName = resolveSeedValue(spec.admin.role, "ADMIN").trim().toUpperCase(Locale.ROOT);
            Role adminRole = createdRoles.getOrDefault(roleName, roleRepository.findByName(roleName).orElse(null));

            Optional<User> existing = userRepository.findByUsername(username);
            if (existing.isEmpty()) {
                User user = new User();
                user.setUsername(username);
                user.setPassword(passwordEncoder.encode(rawPassword));
                if (adminRole != null) {
                    user.getRoles().add(adminRole);
                }
                user.setEnabled(true);
                userRepository.save(user);
                log.info("Created admin user: {} with role: {}", username, roleName);
            } else {
                User user = existing.get();
                boolean changed = false;

                if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
                    user.setPassword(passwordEncoder.encode(rawPassword));
                    changed = true;
                }
                if (adminRole != null && user.getRoles().stream().noneMatch(r -> roleName.equals(r.getName()))) {
                    user.getRoles().add(adminRole);
                    changed = true;
                }
                if (!user.isEnabled()) {
                    user.setEnabled(true);
                    changed = true;
                }

                if (changed) {
                    userRepository.save(user);
                    log.info("Admin user {} updated to match configured credentials and role {}", username, roleName);
                } else {
                    log.info("Admin user {} already aligned with configured credentials and role", username);
                }
            }
        }
    }

    private String resolveSeedValue(String configuredValue, String defaultValue) {
        String rawValue = configuredValue == null ? defaultValue : configuredValue;
        String resolvedValue = environment.resolvePlaceholders(rawValue);
        if (resolvedValue == null || resolvedValue.isBlank()) {
            return defaultValue;
        }
        return resolvedValue;
    }

    @Data
    static class DataSpec {
        public List<String> permissions;
        public List<RoleSpec> roles;
        public AdminSpec admin;
    }

    @Data
    static class RoleSpec {
        public String name;
        public List<String> permissions;
    }

    @Data
    static class AdminSpec {
        public String username;
        public String password;
        public String role;
    }
}
