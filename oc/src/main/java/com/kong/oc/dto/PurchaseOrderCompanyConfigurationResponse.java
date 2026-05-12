package com.kong.oc.dto;

public record PurchaseOrderCompanyConfigurationResponse(
        String companyName,
        String companyRuc,
        String companyAddress
) {
}
