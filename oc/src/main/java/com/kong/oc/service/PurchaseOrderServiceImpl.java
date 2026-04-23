package com.kong.oc.service;

import com.kong.oc.common.exception.BadRequestException;
import com.kong.oc.common.exception.ResourceNotFoundException;
import com.kong.oc.auth.model.User;
import com.kong.oc.auth.repository.UserRepository;
import com.kong.oc.dto.PurchaseOrderDetailResponse;
import com.kong.oc.dto.PurchaseOrderRequest;
import com.kong.oc.dto.PurchaseOrderResponse;
import com.kong.oc.interfaces.IPurchaseOrderService;
import com.kong.oc.model.PurchaseOrder;
import com.kong.oc.model.PurchaseOrderDetail;
import com.kong.oc.model.Services;
import com.kong.oc.dto.Status;
import com.kong.oc.model.Supplier;
import com.kong.oc.repository.PurchaseOrderRepository;
import com.kong.oc.repository.ServicesRepository;
import com.kong.oc.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class PurchaseOrderServiceImpl implements IPurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierRepository supplierRepository;
    private final ServicesRepository servicesRepository;
    private final UserRepository userRepository;

    private static final DateTimeFormatter ORDER_NUMBER_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd");

    @Override
    @Transactional(readOnly = true)
    public String previewNextPurchaseOrderNumber() {
        return generateUniqueOrderNumber();
    }

    @Override
    @Transactional
    public PurchaseOrderResponse create(PurchaseOrderRequest request, Long userId){
        Supplier supplier = findSupplier(request.proveedorId());
        List<Services> servicios = findServices(request);
        User user = findUser(userId);

        validateBusinessRules(request, supplier, servicios);

        PurchaseOrder purchaseOrder = PurchaseOrder.builder()
                .purchaseOrderNumber(resolvePurchaseOrderNumber(request.purchaseOrderNumber()))
                .supplier(supplier)
                .service(servicios)
                .deliveryDate(request.fechaEntrega())
                .sede(request.local().trim())
                .area(request.area().trim())
                .status(resolveStatus(request.status()))
                .notas(normalizeNotes(request.notas()))
                .user_id(user)
                .build();

        purchaseOrder.setDetails(buildDetails(request, purchaseOrder));

        PurchaseOrder saved = purchaseOrderRepository.save(purchaseOrder);
        return toDto(saved);
    }

    @Override
    @Transactional
    public PurchaseOrderResponse update(Long id, PurchaseOrderRequest request) {
        PurchaseOrder current = findActiveById(id);
        Supplier supplier = findSupplier(request.proveedorId());
        List<Services> servicios = findServices(request);

        validateBusinessRules(request, supplier, servicios);

        current.setSupplier(supplier);
        current.setService(servicios);
        current.setDeliveryDate(request.fechaEntrega());
        current.setSede(request.local().trim());
        current.setArea(request.area().trim());
        current.setStatus(resolveStatus(request.status()));
        current.setNotas(normalizeNotes(request.notas()));

        current.getDetails().clear();
        current.getDetails().addAll(buildDetails(request, current));

        return toDto(current);
    }

    @Override
    @Transactional(readOnly = true)
    public PurchaseOrderResponse getById(Long id) {
        return toDto(findActiveById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PurchaseOrderResponse> listAll() {
        return purchaseOrderRepository.findByIsDeletedFalse().stream().map(this::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PurchaseOrderResponse> listBySupplierId(Long supplierId) {
        findSupplier(supplierId);
        return purchaseOrderRepository.findBySupplier_IdAndIsDeletedFalse(supplierId).stream().map(this::toDto).toList();
    }

    @Override
    @Transactional
    public void softDelete(Long id) {
        PurchaseOrder purchaseOrder = findActiveById(id);
        purchaseOrder.softDelete();
    }

    private PurchaseOrder findActiveById(Long id) {
        return purchaseOrderRepository.findById(id)
                .filter(po -> !Boolean.TRUE.equals(po.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("La orden de compra no existe"));
    }

    private Supplier findSupplier(Long supplierId) {
        return supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado"));
    }

    private Services findService(Long serviceId) {
        return servicesRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Servicio no encontrado"));
    }

    private List<Services> findServices(PurchaseOrderRequest request) {
        List<Long> serviceIds = normalizeServiceIds(request);

        if (serviceIds.isEmpty()) {
            throw new BadRequestException("Debe seleccionar al menos un servicio");
        }

        return serviceIds.stream()
                .map(this::findService)
                .toList();
    }

    private User findUser(Long userId) {
        if (userId == null) {
            return null;
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
    }

    private void validateBusinessRules(PurchaseOrderRequest request, Supplier supplier, List<Services> servicios) {
        if (request.local() != null && request.local().isBlank()) {
            throw new BadRequestException("El local es obligatorio");
        }
        if (request.area() != null && request.area().isBlank()) {
            throw new BadRequestException("El area es obligatoria");
        }
        if (request.fechaEntrega() != null && request.fechaEntrega().isBefore(LocalDate.now())) {
            throw new BadRequestException("La fecha de entrega no puede ser anterior a hoy");
        }

        if (supplier.getServicios() == null || supplier.getServicios().isEmpty()) {
            throw new BadRequestException("El proveedor no tiene servicios asociados");
        }

        boolean hasInvalidService = servicios.stream()
                .map(Services::getId)
                .anyMatch(serviceId -> supplier.getServicios().stream().noneMatch(s -> s.getId().equals(serviceId)));

        if (hasInvalidService) {
            throw new BadRequestException("Todos los servicios seleccionados deben pertenecer al mismo proveedor");
        }
    }

    private Status resolveStatus(Status status) {
        return status == null ? Status.BORRADOR : status;
    }

    private String resolvePurchaseOrderNumber(String previewNumber) {
        if (previewNumber != null && !previewNumber.isBlank()) {
            String normalized = previewNumber.trim().toUpperCase();
            if (!purchaseOrderRepository.existsByPurchaseOrderNumber(normalized)) {
                return normalized;
            }
        }

        return generateUniqueOrderNumber();
    }

    private String generateUniqueOrderNumber() {
        String prefix = "OC-" + LocalDate.now().format(ORDER_NUMBER_FORMATTER);
        int attempt = 1;
        String candidate;

        do {
            candidate = prefix + "-" + String.format("%04d", attempt++);
        } while (purchaseOrderRepository.existsByPurchaseOrderNumber(candidate));

        return candidate;
    }

    private String normalizeNotes(String notas) {
        if (notas == null) {
            return null;
        }

        String trimmed = notas.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private PurchaseOrderResponse toDto(PurchaseOrder p){
        Long serviceId = null;
        if (p.getService() != null && !p.getService().isEmpty()) {
            serviceId = p.getService().get(0).getId();
        }

        return new PurchaseOrderResponse(
                p.getId(),
                p.getPurchaseOrderNumber(),
                p.getSupplier() == null ? null : p.getSupplier().getId(),
                serviceId,
                p.getService() == null ? List.of() : p.getService().stream().map(Services::getId).toList(),
                p.getStatus() == null ? null : p.getStatus().name(),
                p.getOrderDate(),
                p.getDeliveryDate(),
                p.getSede(),
                p.getArea(),
                p.getNotas(),
                p.getDetails() == null ? List.of() : p.getDetails().stream().map(this::toDetailDto).toList(),
                p.getCreatedAt()
        );
    }

    private List<PurchaseOrderDetail> buildDetails(PurchaseOrderRequest request, PurchaseOrder purchaseOrder) {
        return request.details().stream()
                .map(d -> PurchaseOrderDetail.builder()
                        .descripcion(d.descripcion().trim())
                        .cantidad(d.cantidad())
                        .purchaseOrder(purchaseOrder)
                        .build())
                .filter(d -> Objects.nonNull(d.getCantidad()))
                .toList();
    }

    private List<Long> normalizeServiceIds(PurchaseOrderRequest request) {
        LinkedHashSet<Long> serviceIds = new LinkedHashSet<>();

        if (request.servicioIds() != null) {
            request.servicioIds().stream()
                    .filter(Objects::nonNull)
                    .forEach(serviceIds::add);
        }

        if (request.servicioId() != null) {
            serviceIds.add(request.servicioId());
        }

        return serviceIds.stream().toList();
    }

    private PurchaseOrderDetailResponse toDetailDto(PurchaseOrderDetail d) {
        return new PurchaseOrderDetailResponse(
                d.getId(),
                d.getDescripcion(),
                d.getCantidad()
        );
    }
}
