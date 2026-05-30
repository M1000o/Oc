package com.kong.oc.service;

import org.springframework.stereotype.Component;

import com.kong.oc.common.exception.BadRequestException;
import com.kong.oc.dto.SupplierFormRequest;
import com.kong.oc.repository.ContactsRepository;
import com.kong.oc.repository.CuentasBancariasRepository;
import com.kong.oc.repository.SupplierRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class SupplierValidator {

private final SupplierRepository supplierRepository;
    private final ContactsRepository contactsRepository;
    private final CuentasBancariasRepository cuentasRepository;

    public void validateCreationRules(SupplierFormRequest req) {
        if (supplierRepository.findByRuc(req.getRuc()).isPresent()) {
            throw new BadRequestException("Ruc ya existe");
        }

        if (supplierRepository.findByRazonSocial(req.getRazon_social()).isPresent()) {
            throw new BadRequestException("Razón social ya existe");
        }

        if (contactsRepository.existsByEmail(req.getCorreo_pedidos())) {
            throw new BadRequestException("Correo de contacto ya en uso");
        }

        if (contactsRepository.existsByPhone(req.getTelefono_contacto())) {
            throw new BadRequestException("Número de teléfono en uso, use otro");
        }

        if (cuentasRepository.existsByNumeroCuenta(req.getAccountNumber_Soles())) {
            throw new BadRequestException("El número de cuenta en soles ya existe");
        }

        if (cuentasRepository.existsByCci(req.getCci_soles())) {
            throw new BadRequestException("El CCI en soles ya está registrado");
        }

        if (req.getAccountNumber_Dolares() != null && !req.getAccountNumber_Dolares().isBlank()) {
            if (cuentasRepository.existsByNumeroCuenta(req.getAccountNumber_Dolares())) {
                throw new BadRequestException("El número de cuenta en dólares ya está registrado");
            }

            if (cuentasRepository.existsByCci(req.getCci_dolares())) {
                throw new BadRequestException("El CCI en dólares ya está registrado");
            }
        }
    }
    
}
