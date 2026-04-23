package com.kong.oc.model;

import com.kong.oc.common.model.BaseEntity;
import com.kong.oc.dto.Unit;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "productos")
public class Product extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "codigo_producto", nullable = false, length = 30)
    private String codigoProducto;

    private String nombre;
    private String descripcion;
    private BigDecimal precio;

    @Enumerated(EnumType.STRING)
    @Column(name = "und", nullable = false)
    private Unit und_medida;

    @ManyToOne
    @JoinColumn(name = "proveedor_id")
    private Supplier proveedor;

    @ManyToOne
    @JoinColumn(name = "servicio_id")
    private Services servicio;
}
