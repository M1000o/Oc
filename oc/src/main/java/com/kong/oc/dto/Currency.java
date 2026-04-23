package com.kong.oc.dto;

import lombok.Getter;

@Getter
public enum Currency {
    PEN("Soles"),
    USD("Dolares");

    private final String description;

    Currency(String description) {
        this.description = description;
    }
}
