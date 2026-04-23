package com.kong.oc.model;

import com.kong.oc.common.model.BaseEntity;
import com.kong.oc.dto.AccountType;
import com.kong.oc.dto.Currency;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "cuentas_bancarias")
public class CuentasBancarias extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long cuentaId;

    @ManyToOne
    @JoinColumn(name = "banco_id", nullable = false)
    private Banks banco;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_cuenta", nullable = false)
    private AccountType tipoCuenta;

    @Enumerated(EnumType.STRING)
    @Column(name = "moneda", nullable = false)
    private Currency moneda;

    @Column(nullable = false, unique = true)
    private String numeroCuenta;

    @Column(nullable = false, unique = true)
    private String cci;

    @ManyToOne
    @JoinColumn(name = "proveedor_id")
    private Supplier proveedor;
}
