package com.kong.oc.security;

import com.kong.oc.auth.model.User;
import com.kong.oc.auth.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    public UserDetailsServiceImpl(UserRepository userRepository){
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username){
        User user = userRepository.findByUsernameIgnoreCase(username)
                .or(() -> userRepository.findByUsername(username))
                .orElseThrow(() ->
                        new UsernameNotFoundException("Usuario no encontrado")
                );

        // Inicializar las colecciones lazy antes de que se cierre la transacción
        user.getRoles().size(); // Fuerza la carga de roles
        user.getRoles().forEach(role -> role.getPermissions().size()); // Fuerza la carga de permisos

        return new UserDetailsImpl(user);
    }

}
