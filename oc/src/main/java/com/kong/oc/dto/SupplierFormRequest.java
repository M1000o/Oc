package com.kong.oc.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class SupplierFormRequest {

    @NotBlank(message = "RUC es obligatorio")
    @Pattern(regexp = "^[0-9]{11}$", message = "RUC debe tener 11 dígitos numéricos")
    private String ruc;

    @NotBlank(message = "Razón social es obligatoria")
    private String razon_social;

    @NotNull(message = "Services es obligatorio")
    @Size(min = 1, message = "Debe seleccionar al menos un servicio")
    private List<Long> services;

    @NotBlank(message = "Nombre contacto es obligatorio")
    private String nombre_contacto;

    @NotBlank(message = "Apellido paterno es obligatorio")
    private String apellido_p_contacto;

    private String apellido_m_contacto;

    @NotBlank(message = "Teléfono de contacto es obligatorio")
    @Pattern(regexp = "^9[0-9]{8}$", message = "Teléfono de contacto debe tener 9 dígitos y comenzar con 9")
    private String telefono_contacto;

    @NotBlank(message = "Correo para pedidos es obligatorio")
    @Email(message = "Correo para pedidos inválido")
    private String correo_pedidos;

    @NotNull(message = "El banco es necesario")
    private Long bank;

    @NotNull(message = "Tipo de cuenta es obligatorio")
    private AccountType accountType;

    @NotBlank(message = "El número de cuenta en soles es obligatorio")
    private String accountNumber_Soles;

    @NotBlank(message = "El cci en soles es obligatorio")
    private String cci_soles;

    private String accountNumber_Dolares;

    private String cci_dolares;

    @NotNull(message = "is_detraccion es obligatorio")
    private Boolean is_detraccion;

    private String accountNumber_Detraccion;

    @Email(message = "Correo constancia inválido")
    private String correo_constancia;

    @NotNull(message = "creditDays es obligatorio")
    @Min(value = 0, message = "creditDays inválido")
    private Integer creditDays;

    @AssertTrue(message = "Si ingresa cuenta en dólares, debe ingresar también el CCI en dólares")
    public boolean isValidDollarAccount(){
        boolean hasAccount = accountNumber_Dolares != null && !accountNumber_Dolares.isBlank();

        boolean hasCci = cci_dolares != null && !cci_dolares.isBlank();

        return hasAccount == hasCci;
    }
}
