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
import java.util.UUID;

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

    private ProveedorResponse toDto(Supplier s) {
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

    @Transactional
    public Supplier createFromForm(SupplierFormRequest req) {

        validateBussinessRules(req);
        Supplier supplier = buildSupplier(req);

        User user = createSupplierUser(req);
        supplier.setUser(user);

        supplier = supplierRepository.save(supplier);

        createContact(req, supplier);

        createBankAccounts(req, supplier);

        return supplier;
    }

    private void validateBussinessRules(SupplierFormRequest req) {
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

        if(cuentasRepository.existsByNumeroCuenta(req.getAccountNumber_Soles())){
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

    private Supplier buildSupplier(SupplierFormRequest req) {
        CreditDays creditDays;

        try {
            creditDays = CreditDays.fromDays(req.getCreditDays());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(
                    "Días de crédito inválidos: " + req.getCreditDays()
            );
        }

        List<Services> servicios = req.getServices()
                .stream()
                .map(this::findServiceById)
                .toList();

        return Supplier.builder()
                .ruc(req.getRuc())
                .razonSocial(req.getRazon_social())
                .creditDays(creditDays)
                .tiene_cuenta_detraccion(req.getIs_detraccion())
                .cuenta_detraccion(req.getAccountNumber_Detraccion())
                .correoConstancias(req.getCorreo_constancia())
                .servicios(servicios)
                .build();
    }

    private Services findServiceById(Long id) {
        return servicesRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Servicio no encontrado id: " + id));
    }

    private User createSupplierUser(SupplierFormRequest req){

        String base = UsernameUtils.generateBase(
                req.getNombre_contacto(),
                req.getApellido_p_contacto()
        );

        String username = UsernameUtils.generateUniqueUsername(userRepository, base);

        if(username == null || username.isBlank()){
            throw new BadRequestException(
                    "No se pudo generar ub username válido"
            );
        }

        User user = new User();

        user.setUsername(username);

        String tempPass = UUID.randomUUID().toString();

        user.setPassword(passwordEncoder.encode(tempPass));

        user.setEnabled(false);

        user.setRequiresPasswordChange(true);

        roleRepository.findByName("PROVEEDOR").ifPresent(user.getRoles()::add);

        return userRepository.save(user);
    }

    private void createContact(
            SupplierFormRequest req,
            Supplier s
    ){

        Contacts contact = new Contacts();

        contact.setSupplier(s);
        contact.setName(req.getNombre_contacto());
        contact.setApellido_paterno(req.getApellido_p_contacto());
        contact.setApellido_materno(req.getApellido_m_contacto());
        contact.setPhone(req.getTelefono_contacto());
        contact.setEmail(req.getCorreo_pedidos());

        contactsRepository.save(contact);

        activationService.createActivationForUser(
                s.getUser(),
                contact.getEmail()
        );
    }

    private void createBankAccounts(
            SupplierFormRequest req,
            Supplier s
    ){
        Banks bank = banksRepository.findById(req.getBank())
                .orElseThrow(() -> new BadRequestException("Banco no encontrado id: " + req.getBank()));

        saveAccount(
                s,
                bank,
                req.getAccountType(),
                Currency.PEN,
                req.getAccountNumber_Soles(),
                req.getCci_soles()
        );

        if(req.getAccountNumber_Dolares() != null && !req.getAccountNumber_Dolares().isBlank()){
            saveAccount(
                    s,
                    bank,
                    req.getAccountType(),
                    Currency.USD,
                    req.getAccountNumber_Dolares(),
                    req.getCci_dolares()
            );
        }
    }

    private void saveAccount(
            Supplier s,
            Banks bank,
            AccountType accountType,
            Currency currency,
            String accountNumber,
            String cci
    ){
        CuentasBancarias cuenta = new CuentasBancarias();

        cuenta.setProveedor(s);
        cuenta.setBanco(bank);
        cuenta.setTipoCuenta(accountType);
        cuenta.setMoneda(currency);
        cuenta.setNumeroCuenta(accountNumber);
        cuenta.setCci(cci);

        cuentasRepository.save(cuenta);
    }


}
