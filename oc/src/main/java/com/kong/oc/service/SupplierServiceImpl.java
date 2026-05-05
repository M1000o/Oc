package com.kong.oc.service;

import com.kong.oc.auth.model.User;
import com.kong.oc.auth.repository.RoleRepository;
import com.kong.oc.auth.repository.UserRepository;
import com.kong.oc.auth.service.ActivationService;
import com.kong.oc.auth.util.UsernameUtils;
import com.kong.oc.dto.*;
import com.kong.oc.interfaces.ISupplierService;
import com.kong.oc.model.*;
import com.kong.oc.repository.*;
import com.kong.oc.common.exception.BadRequestException;
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
    private final ProductRepository productRepository;
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

    @Override
    @Transactional(readOnly = true)
    public List<SupplierDirectoryItemResponse> listDirectory() {
        return supplierRepository.findAll()
                .stream()
                .filter(supplier -> !Boolean.TRUE.equals(supplier.getIsDeleted()))
                .map(this::toDirectoryItem)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SupplierDirectoryDetailResponse getDirectoryDetail(Long supplierId) {
        Supplier supplier = supplierRepository.findByIdAndIsDeletedFalse(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado"));

        Contacts primaryContact = contactsRepository
                .findFirstBySupplier_IdAndIsDeletedFalseOrderByIdAsc(supplierId)
                .orElse(null);

        long totalProductos = productRepository.countByProveedorAndIsDeletedFalse(supplier);
        List<String> categorias = extractCategoryNames(supplier);
        String estado = resolveStatus(supplier, primaryContact, totalProductos, categorias);

        return new SupplierDirectoryDetailResponse(
                supplier.getId(),
                supplier.getRazonSocial(),
                supplier.getRuc(),
                supplier.getCreditDays() != null ? supplier.getCreditDays().getDays() : null,
                supplier.getCreditDays() != null ? supplier.getCreditDays().getDays() + " días" : "No configurado",
                supplier.isTiene_cuenta_detraccion(),
                supplier.getCuenta_detraccion(),
                supplier.getCorreoConstancias(),
                buildContactName(primaryContact),
                primaryContact != null ? primaryContact.getEmail() : null,
                primaryContact != null ? primaryContact.getPhone() : null,
                categorias,
                totalProductos,
                estado,
                supplier.getCreatedAt()
        );
    }

    private ProveedorResponse toDto(Supplier s){
        return new ProveedorResponse(
                s.getId(),
                s.getRazonSocial(),
                s.getRuc()
        );
    }

    private SupplierDirectoryItemResponse toDirectoryItem(Supplier supplier) {
        Contacts primaryContact = contactsRepository
                .findFirstBySupplier_IdAndIsDeletedFalseOrderByIdAsc(supplier.getId())
                .orElse(null);
        long totalProductos = productRepository.countByProveedorAndIsDeletedFalse(supplier);
        List<String> categorias = extractCategoryNames(supplier);
        String estado = resolveStatus(supplier, primaryContact, totalProductos, categorias);

        return new SupplierDirectoryItemResponse(
                supplier.getId(),
                supplier.getRazonSocial(),
                supplier.getRuc(),
                buildContactName(primaryContact),
                primaryContact != null ? primaryContact.getEmail() : null,
                primaryContact != null ? primaryContact.getPhone() : null,
                categorias,
                totalProductos,
                estado
        );
    }

    private List<String> extractCategoryNames(Supplier supplier) {
        if (supplier.getServicios() == null) {
            return List.of();
        }

        return supplier.getServicios()
                .stream()
                .filter(service -> !Boolean.TRUE.equals(service.getIsDeleted()))
                .map(Services::getNombre)
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
    }

    private String buildContactName(Contacts contact) {
        if (contact == null) {
            return null;
        }

        return String.join(" ",
                        contact.getName(),
                        contact.getApellido_paterno(),
                        contact.getApellido_materno() != null ? contact.getApellido_materno() : "")
                .trim()
                .replaceAll("\\s+", " ");
    }

    private String resolveStatus(
            Supplier supplier,
            Contacts primaryContact,
            long totalProductos,
            List<String> categorias
    ) {
        if (Boolean.TRUE.equals(supplier.getIsDeleted())) {
            return "INACTIVO";
        }

        boolean hasContactInfo = primaryContact != null
                && primaryContact.getPhone() != null
                && !primaryContact.getPhone().isBlank()
                && primaryContact.getEmail() != null
                && !primaryContact.getEmail().isBlank();

        boolean hasCategories = categorias != null && !categorias.isEmpty();

        if (!hasContactInfo || !hasCategories || totalProductos == 0) {
            return "REVISION";
        }

        return "ACTIVO";
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
        return supplierRepository.findByUser_Id(userId);
    }

    @Transactional
    public Supplier createFromForm(SupplierFormRequest req) {
        // Validaciones adicionales
        if (supplierRepository.findByRuc(req.getRuc()).isPresent()) {
            throw new BadRequestException("RUC ya existe");
        }

        Supplier supplier = new Supplier();
        supplier.setRuc(req.getRuc());
        supplier.setRazonSocial(req.getRazon_social());
        try {
            supplier.setCreditDays(CreditDays.fromDays(req.getCreditDays()));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Días de crédito inválidos: " + req.getCreditDays());
        }
        supplier.setTiene_cuenta_detraccion(req.getIs_detraccion());
        supplier.setCuenta_detraccion(req.getAccountNumber_Detraccion());
        supplier.setCorreoConstancias(req.getCorreo_constancia());

        // Servicios
        List<Services> servicios = req.getServices().stream()
                .map(id -> servicesRepository.findById(id)
                        .orElseThrow(() -> new BadRequestException("Servicio no encontrado id: " + id)))
                .collect(Collectors.toList());
        supplier.setServicios(servicios);

        // Crear usuario inactivo asociado al contacto (username = inicial del nombre + apellido paterno)
        // Generar base y username único
        String base = UsernameUtils.generateBase(req.getNombre_contacto(), req.getApellido_p_contacto());
        String username = UsernameUtils.generateUniqueUsername(userRepository, base);
        if (username == null || username.isBlank()) {
            throw new BadRequestException("No se pudo generar un username válido para el contacto");
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

        supplier.setUser(user);
        supplier = supplierRepository.save(supplier);

        // Contacto
        Contacts contact = new Contacts();
        contact.setSupplier(supplier);
        contact.setName(req.getNombre_contacto());
        contact.setApellido_materno(req.getApellido_m_contacto());
        contact.setApellido_paterno(req.getApellido_p_contacto());
        // Validación de teléfono: obligatorio y único
        String telefono = req.getTelefono_contacto();
        if (telefono == null || telefono.isBlank()) {
            throw new BadRequestException("Telefono de contacto es obligatorio");
        }
        if (contactsRepository.existsByPhone(telefono)) {
            throw new BadRequestException("numero de telefono en uso, use otro");
        }
        contact.setPhone(telefono);
        contact.setEmail(req.getCorreo_pedidos());
        contactsRepository.save(contact);

        // crear token y disparar email de activación (seguimos usando el email del contacto)
        activationService.createActivationForUser(user, contact.getEmail());

        // Bank
        Banks bankEntity = null;
        if (req.getBank() != null) {
            bankEntity = banksRepository.findById(req.getBank())
                    .orElseThrow(() -> new BadRequestException("Banco no encontrado id: " + req.getBank()));
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
