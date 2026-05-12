package com.kong.oc.model;

import com.kong.oc.common.model.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "purchase_order_company_configuration")
public class PurchaseOrderCompanyConfiguration extends BaseEntity {

    public static final Long SINGLETON_ID = 1L;

    @Id
    private Long id;

    @Column(name = "company_name", nullable = false, length = 180)
    private String companyName;

    @Column(name = "company_ruc", nullable = false, length = 20)
    private String companyRuc;

    @Column(name = "company_address", nullable = false, length = 280)
    private String companyAddress;
}
