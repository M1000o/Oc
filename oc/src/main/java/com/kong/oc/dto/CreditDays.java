package com.kong.oc.dto;

import lombok.Getter;

@Getter
public enum CreditDays {
    SEVEN(7),
    FIFTEEN(15),
    TWENTY_ONE(21),
    THIRTY(30),
    FORTY_FIVE(45),
    SIXTY(60);

    private final int days;

    CreditDays(int days) {
        this.days = days;
    }

    public static CreditDays fromDays(int days) {
        for (CreditDays c : values()) {
            if (c.getDays() == days) {
                return c;
            }
        }
        throw new IllegalArgumentException("Días de crédito inválidos: " + days);
    }

}
