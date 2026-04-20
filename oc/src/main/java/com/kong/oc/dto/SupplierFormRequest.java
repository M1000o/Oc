package com.kong.oc.dto;

import com.kong.oc.model.AccountType;
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
    private List<Long> services; // ids de Services

    @NotBlank(message = "Nombre contacto es obligatorio")
    private String nombre_contacto;

    @NotBlank(message = "Apellido paterno es obligatorio")
    private String apellido_p_contacto;

    private String apellido_m_contacto;

    @NotBlank(message = "Teléfono de contacto es obligatorio")
    @Pattern(regexp = "^\\+?[0-9]{7,15}$", message = "Número de celular inválido")
    private String telefono_contacto;

    @NotBlank(message = "Correo para pedidos es obligatorio")
    @Email(message = "Correo para pedidos inválido")
    private String correo_pedidos;

    private Long bank; // id de Banks

    @NotNull(message = "Tipo de cuenta es obligatorio")
    private AccountType accountType;

    @NotNull(message = "El número de cuenta en soles es obligatorio")
    private String accountNumber_Soles;

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
}
