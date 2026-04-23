package com.kong.oc.model;

import com.kong.oc.auth.model.User;
import com.kong.oc.common.model.BaseEntity;
import com.kong.oc.dto.CreditDays;
import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "proveedor")
public class Supplier extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, length = 11, nullable = false)
    private String ruc;

    @Column(nullable = false)
    private String razonSocial;

    @Convert(converter = CreditDaysConverter.class)
    @Column(name = "dias_credito", nullable = false)
    private CreditDays creditDays;

    private boolean tiene_cuenta_detraccion = false;

    private String cuenta_detraccion;

    private String correoConstancias;

    @ManyToMany
    @JoinTable(
            name = "proveedor_servicio",
            joinColumns = @JoinColumn(name = "proveedor_id"),
            inverseJoinColumns = @JoinColumn(name = "servicio_id")
    )
    private List<Services> servicios;

    // Asociación opcional al usuario de autenticación creado para el contacto/proveedor
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

}