package com.kong.oc.service;

import com.kong.oc.auth.model.User;
import com.kong.oc.auth.repository.RoleRepository;
import com.kong.oc.auth.repository.UserRepository;
import com.kong.oc.auth.service.ActivationService;
import com.kong.oc.auth.util.UsernameUtils;
import com.kong.oc.dto.ProveedorResponse;
import com.kong.oc.dto.ServicioResponse;
import com.kong.oc.dto.SupplierFormRequest;
import com.kong.oc.interfaces.ISupplierService;
import com.kong.oc.model.*;
import com.kong.oc.repository.*;
import com.kong.oc.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SupplierServiceImpl implements ISupplierService {

    private final SupplierRepository supplierRepository;
    private final ServicesRepository servicesRepository;
    private final ContactsRepository contactsRepository;
    private final CuentasBancariasRepository cuentasRepository;
    private final BanksRepository banksRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ActivationService activationService;
    private final PasswordEncoder passwordEncoder;

    @Override
    public List<ProveedorResponse> listAll() {
        return supplierRepository.findAll()
                .stream()
                .map(this::toDto)
                .toList();
    }

    private ProveedorResponse toDto(Supplier s){
        return new ProveedorResponse(
                s.getId(),
                s.getRazonSocial(),
                s.getRuc()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServicioResponse> listServiciosByProveedor(Long proveedorId) {
        Supplier supplier = supplierRepository.findById(proveedorId)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado"));
        List<Services> servicios = supplier.getServicios();
        if (servicios == null) return List.of();
        return servicios.stream()
                .map(s -> new ServicioResponse(s.getId(), s.getNombre()))
                .toList();
    }

    @Override
    public Optional<Supplier> findByUserId(Long userId) {
        return supplierRepository.findAll().stream()
                .filter(s -> s.getUser() != null && s.getUser().getId().equals(userId))
                .findFirst();
    }

    @Transactional
    public Supplier createFromForm(SupplierFormRequest req) {
        // Validaciones adicionales
        if (supplierRepository.findByRuc(req.getRuc()).isPresent()) {
            throw new IllegalArgumentException("RUC ya existe");
        }

        Supplier supplier = new Supplier();
        supplier.setRuc(req.getRuc());
        supplier.setRazonSocial(req.getRazon_social());
        try {
            supplier.setCreditDays(CreditDays.fromDays(req.getCreditDays()));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Días de crédito inválidos: " + req.getCreditDays());
        }
        supplier.setTiene_cuenta_detraccion(req.getIs_detraccion());
        supplier.setCuenta_detraccion(req.getAccountNumber_Detraccion());
        supplier.setCorreoConstancias(req.getCorreo_constancia());

        // Servicios
        List<Services> servicios = req.getServices().stream()
                .map(id -> servicesRepository.findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("Servicio no encontrado id: " + id)))
                .collect(Collectors.toList());
        supplier.setServicios(servicios);

        supplier = supplierRepository.save(supplier);

        // Contacto
        Contacts contact = new Contacts();
        contact.setSupplier(supplier);
        contact.setName(req.getNombre_contacto());
        contact.setApellido_materno(req.getApellido_m_contacto());
        contact.setApellido_paterno(req.getApellido_p_contacto());
        contact.setPhone(req.getTelefono_contacto());
        contact.setEmail(req.getCorreo_pedidos());
        contactsRepository.save(contact);

        // Crear usuario inactivo asociado al contacto (username = inicial del nombre + apellido paterno)
        // Generar base y username único
        String base = UsernameUtils.generateBase(contact.getName(), contact.getApellido_paterno());
        String username = UsernameUtils.generateUniqueUsername(userRepository, base);
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("No se pudo generar un username válido para el contacto");
        }

        User user = new User();
        user.setUsername(username);
        // password temporal: generar random y guardar hasheado (no se enviará)
        String tempPass = UUID.randomUUID().toString();
        user.setPassword(passwordEncoder.encode(tempPass));
        user.setEnabled(false);
        user.setRequiresPasswordChange(true);
        // asignar rol PROVEEDOR si existe
        roleRepository.findByName("PROVEEDOR").ifPresent(user.getRoles()::add);

        user = userRepository.save(user);

        // crear token y disparar email de activación (seguimos usando el email del contacto)
        activationService.createActivationForUser(user, contact.getEmail());

        // Bank
        Banks bankEntity = null;
        if (req.getBank() != null) {
            bankEntity = banksRepository.findById(req.getBank())
                    .orElseThrow(() -> new IllegalArgumentException("Banco no encontrado id: " + req.getBank()));
        }

        // Cuentas Soles
        if (req.getAccountNumber_Soles() != null && !req.getAccountNumber_Soles().isBlank()) {
            CuentasBancarias cuenta = new CuentasBancarias();
            cuenta.setBanco(bankEntity);
            cuenta.setTipoCuenta(req.getAccountType());
            cuenta.setMoneda(Currency.PEN);
            cuenta.setNumeroCuenta(req.getAccountNumber_Soles());
            cuenta.setCci(req.getCci_soles());
            cuenta.setProveedor(supplier);
            cuentasRepository.save(cuenta);
        }

        // Cuentas Dolares
        if (req.getAccountNumber_Dolares() != null && !req.getAccountNumber_Dolares().isBlank()) {
            CuentasBancarias cuenta = new CuentasBancarias();
            cuenta.setBanco(bankEntity);
            cuenta.setTipoCuenta(req.getAccountType());
            cuenta.setMoneda(Currency.USD);
            cuenta.setNumeroCuenta(req.getAccountNumber_Dolares());
            cuenta.setCci(req.getCci_dolares());
            cuenta.setProveedor(supplier);
            cuentasRepository.save(cuenta);
        }

        return supplier;
    }

}
