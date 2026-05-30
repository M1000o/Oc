package com.kong.oc.model;

import com.kong.oc.auth.model.User;
import com.kong.oc.common.model.BaseEntity;
import com.kong.oc.dto.CalidadStatus;
import com.kong.oc.dto.DeliveryStatus;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "purchase_order_quality_inspections")
public class PurchaseOrderQualityInspection extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id", nullable = false, unique = true)
    private PurchaseOrder purchaseOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private CalidadStatus calidadStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private DeliveryStatus deliveryStatus;

    @Column(length = 500)
    private String motivo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_user_id")
    private User reviewedBy;

    @OneToMany(mappedBy = "inspection", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PurchaseOrderQualityInspectionDetail> details = new ArrayList<>();

    public void addDetail(PurchaseOrderQualityInspectionDetail detail) {
        if (details == null) details = new ArrayList<>();
        details.add(detail);
        detail.setInspection(this);
    }
}
