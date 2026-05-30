package com.kong.oc.model;

import com.kong.oc.common.model.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(
        name = "purchase_order_quality_inspection_details",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_quality_inspection_order_detail",
                columnNames = {"inspection_id", "purchase_order_detail_id"}
        )
)
public class PurchaseOrderQualityInspectionDetail extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspection_id", nullable = false)
    private PurchaseOrderQualityInspection inspection;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_detail_id", nullable = false)
    private PurchaseOrderDetail purchaseOrderDetail;

    @Column(nullable = false)
    private Integer orderedQuantity;

    @Column(nullable = false)
    private Integer acceptedQuantity;

    @Column(nullable = false)
    private Integer rejectedQuantity;

    @Column(length = 500)
    private String motivo;
}
