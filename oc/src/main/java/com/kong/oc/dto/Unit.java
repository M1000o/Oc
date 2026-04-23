package com.kong.oc.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum Unit {
    KG("Kilogramos"),
    UND("Unidad"),
    PAQ("Paquete"),
    DOC("Docena"),
    GR("Gramos");

    private final String description;
}
