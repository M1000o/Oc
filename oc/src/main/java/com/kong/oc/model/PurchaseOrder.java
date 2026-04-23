package com.kong.oc.model;

import com.kong.oc.auth.model.User;
import com.kong.oc.common.model.BaseEntity;
import com.kong.oc.dto.Status;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "purchase_orders")
public class PurchaseOrder extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String purchaseOrderNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proveedor_id")
    private Supplier supplier;

    @ManyToMany
    @JoinTable(
            name = "purchase_order_services",
            joinColumns = @JoinColumn(name = "purchase_order_id"),
            inverseJoinColumns = @JoinColumn(name = "service_id")
    )
    private List<Services> service;

    private LocalDate orderDate;

    private LocalDate deliveryDate;

    private String sede;

    private String area;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    private String notas;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user_id;

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PurchaseOrderDetail> details = new ArrayList<>();

    @PrePersist
    protected void onCreatePurchaseOrder() {
        if(this.orderDate == null){
            this.orderDate = LocalDate.now();
        }
    }
}

