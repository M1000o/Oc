package com.kong.oc.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SupplierFormResponse {
    private Long id;
    private String ruc;
    private String razonSocial;
    private Integer creditDays;
    @JsonProperty("creditDaysLabel")
    public String getCreditDaysLabel(){
        if (creditDays == null) return null;
        if (creditDays == 0) return "EFECTIVO";
        return creditDays + " días";
    }
}
