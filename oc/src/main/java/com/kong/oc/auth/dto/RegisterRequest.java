package com.kong.oc.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class RegisterRequest {

    @Pattern(regexp = "^[a-zA-Z0-9_-]+$", message = "El username solo puede contener letras, números, guiones y guiones bajos")
    @Size(min = 3, max = 50, message = "El username debe tener entre 3 y 50 caracteres")
    @NotBlank(message = "El username es obligatorio")
    private String username;

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 8, max = 100, message = "La contraseña debe tener entre 8 y 100 caracteres")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$",
            message = "La contraseña debe contener al menos una minúscula, una mayúscula y un número")
    private String password;

    private Long roleId;
}
