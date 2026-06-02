package com.kong.oc.model;

import com.kong.oc.common.model.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "unidades_medida")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Unit extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String codigo;

    @Column(nullable = false, length = 100)
    private String nombre;
}
