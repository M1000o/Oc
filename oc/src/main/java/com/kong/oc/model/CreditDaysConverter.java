package com.kong.oc.model;

import com.kong.oc.common.exception.BadRequestException;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter()
public class CreditDaysConverter implements AttributeConverter<CreditDays, Integer>{

    @Override
    public Integer convertToDatabaseColumn(CreditDays attribute) {
        return attribute != null ? attribute.getDays() : null;
    }

    @Override
    public CreditDays convertToEntityAttribute(Integer dbData) {
        if (dbData == null) return null;

        for (CreditDays c : CreditDays.values()) {
            if (c.getDays() == dbData) {
                return c;
            }
        }

        throw new BadRequestException("Valor inválido para CreditDays: " + dbData);
    }


}
