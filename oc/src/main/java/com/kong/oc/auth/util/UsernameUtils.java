package com.kong.oc.auth.util;

import com.kong.oc.auth.repository.UserRepository;

import java.text.Normalizer;
import java.util.Locale;

public class UsernameUtils {

    // Normaliza eliminando acentos y caracteres no alfanuméricos (dejando guiones y guion bajo si necesarios)
    public static String normalizeForUsername(String input) {
        if (input == null) return "";
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        // Mantener solo letras y números y guiones/guiones bajos
        normalized = normalized.replaceAll("[^A-Za-z0-9_-]", "");
        return normalized.toLowerCase(Locale.ROOT);
    }

    // Genera la base: inicial del nombre + apellido paterno
    public static String generateBase(String nombre, String apellidoPaterno) {
        if (nombre == null) nombre = "";
        if (apellidoPaterno == null) apellidoPaterno = "";
        String initial = nombre.trim().isEmpty() ? "" : nombre.trim().substring(0, 1);
        String baseRaw = (initial + apellidoPaterno.trim()).toLowerCase();
        return normalizeForUsername(baseRaw);
    }

    // Genera un username único consultando UserRepository (usa findByUsernameIgnoreCase)
    public static String generateUniqueUsername(UserRepository userRepository, String base) {
        String candidate = base;
        int suffix = 0;
        while (true) {
            boolean exists = userRepository.findByUsernameIgnoreCase(candidate).isPresent();
            if (!exists) return candidate;
            suffix++;
            candidate = base + suffix;
        }
    }
}
