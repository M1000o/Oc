package com.kong.oc.model;

import com.kong.oc.auth.model.User;
import com.kong.oc.common.model.BaseEntity;
import com.kong.oc.dto.CalidadStatus;
import com.kong.oc.dto.DeliveryStatus;
import com.kong.oc.dto.PurchaseOrderEmailStatus;
import com.kong.oc.dto.Status;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
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

    @Column(nullable = false)
    private LocalDate orderDate;

    private LocalDate deliveryDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "area_id", nullable = false)
    private Area area;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Enumerated(EnumType.STRING)
    @Column(length = 40)
    private PurchaseOrderEmailStatus emailStatus;

    @Enumerated(EnumType.STRING)
    @Column(length = 40)
    private DeliveryStatus deliveryStatus;

    @Enumerated(EnumType.STRING)
    @Column(length = 40)
    private CalidadStatus calidadStatus;

    private String notas;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User usuario;

    @Column(nullable = false)
    private BigDecimal subtotal;

    @Column(nullable = false)
    private BigDecimal igv;

    @Column(nullable = false)
    private BigDecimal total;

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PurchaseOrderDetail> details = new ArrayList<>();

    public void addDetail(PurchaseOrderDetail detail) {
        if(details == null) details = new ArrayList<>();

        details.add(detail);
        detail.setPurchaseOrder(this);
    }

    public void removeDetail(PurchaseOrderDetail detail) {
        details.remove(detail);
        detail.setPurchaseOrder(null);
    }

    @PrePersist
    protected void onCreatePurchaseOrder() {
        if(this.orderDate == null){
            this.orderDate = LocalDate.now();
        }
        if (this.emailStatus == null) {
            this.emailStatus = PurchaseOrderEmailStatus.PENDIENTE_ENVIO;
        }
    }
}
