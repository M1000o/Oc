package com.kong.oc.service;

import com.kong.oc.common.exception.BadRequestException;
import com.kong.oc.common.exception.PurchaseOrderEmailDispatchException;
import com.kong.oc.common.exception.PurchaseOrderRecipientException;
import com.kong.oc.common.exception.ResourceNotFoundException;
import com.kong.oc.auth.model.User;
import com.kong.oc.auth.repository.UserRepository;
import com.kong.oc.dto.*;
import com.kong.oc.interfaces.IPurchaseOrderService;
import com.kong.oc.mapper.PurchaseOrderMapper;
import com.kong.oc.model.*;
import com.kong.oc.repository.ProductRepository;
import com.kong.oc.repository.PurchaseOrderRepository;
import com.kong.oc.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PurchaseOrderServiceImpl implements IPurchaseOrderService {

    private static final BigDecimal IGV_RATE = new BigDecimal("0.18");

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;
    private final PurchaseOrderMapper mapper;
    private final UserRepository userRepository;
    private final PurchaseOrderEmailService purchaseOrderEmailService;


    @Override
    @Transactional
    public PurchaseOrderResponse create(PurchaseOrderRequest request, Long userId){

        boolean isDraft = Boolean.TRUE.equals(request.saveDraft());

        Supplier supplier = findSupplierOrThrow(request.supplierId());
        User user = findUserOrThrow(userId);

        validateDates(request);

        List<Long> productIds = request.details().stream()
                .map(PurchaseOrderDetailRequest::productId)
                .toList();

        Map<Long, Product> productMap = loadAndValidateProducts(productIds, supplier.getId(), isDraft);

        PurchaseOrder order = PurchaseOrder.builder()
                .purchaseOrderNumber(generateOrderNumber())
                .supplier(supplier)
                .orderDate(LocalDate.now())
                .deliveryDate(request.deliveryDate())
                .sede(request.sede().trim())
                .area(request.area().trim())
                .notas(request.notas())
                .status(isDraft ? Status.BORRADOR : Status.PENDIENTE)
                .emailStatus(PurchaseOrderEmailStatus.PENDIENTE_ENVIO)
                .usuario(user)
                .subtotal(BigDecimal.ZERO)
                .igv(BigDecimal.ZERO)
                .total(BigDecimal.ZERO)
                .build();

        buildAndAttachDetails(order, request.details(), productMap);
        calculateTotals(order);

        PurchaseOrder saved = purchaseOrderRepository.save(order);
        return mapper.toResponse(saved);
    }

    @Override
    @Transactional
    public PurchaseOrderResponse update(Long id, PurchaseOrderRequest request) {

        PurchaseOrder order = findOrderWithDetailsOrThrow(id);

        if(order.getStatus() != Status.BORRADOR){
            throw new BadRequestException(
                    "Solo se puede modificar órdenes en estado BORRADOR. Estado actual: " + order.getStatus()
            );
        }

        boolean isDraft = Boolean.TRUE.equals(request.saveDraft());

        if(!order.getSupplier().getId().equals(request.supplierId())){
            Supplier newSupplier = findSupplierOrThrow(request.supplierId());
            order.setSupplier(newSupplier);
        }

        validateDates(request);

        List<Long> productIds = request.details().stream()
                .map(PurchaseOrderDetailRequest::productId)
                .toList();

        Map<Long, Product> productMap = loadAndValidateProducts(productIds, order.getSupplier().getId(), isDraft);

        order.getDetails().clear();
        buildAndAttachDetails(order, request.details(), productMap);

        order.setOrderDate(request.orderDate());
        order.setDeliveryDate(request.deliveryDate());
        order.setSede(request.sede().trim());
        order.setArea(request.area().trim());
        order.setNotas(request.notas());
        order.setStatus(isDraft ? Status.BORRADOR : Status.PENDIENTE);
        if (isDraft) {
            order.setEmailStatus(PurchaseOrderEmailStatus.PENDIENTE_ENVIO);
        }

        calculateTotals(order);

        return mapper.toResponse(purchaseOrderRepository.save(order));
    }

    @Override
    @Transactional
    public PurchaseOrderResponse changeStatus(Long id, PurchaseOrderStatus statusDTO) {

        PurchaseOrder order = findOrderOrThrow(id);

        validateStatusTransition(order.getStatus(), statusDTO.status());

        order.setStatus(statusDTO.status());

        // Si cancela, podemos guardar el motivo en notas (opcional)
        if (statusDTO.status() == Status.CANCELADO && statusDTO.motivo() != null) {
            String notasCancelacion = "[CANCELADO] " + statusDTO.motivo();
            order.setNotas(order.getNotas() != null
                    ? order.getNotas() + "\n" + notasCancelacion
                    : notasCancelacion);
        }

        return mapper.toResponse(purchaseOrderRepository.save(order));
    }

    @Override
    @Transactional(readOnly = true)
    public PurchaseOrderResponse findById(Long id) {
        return mapper.toResponse(findOrderWithDetailsOrThrow(id));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PurchaseOrderSummary> findAll(PurchaseOrderFilter filter, Pageable pageable){

        if(filter.fechaDesde() != null && filter.fechaHasta() != null && filter.fechaDesde().isAfter(filter.fechaHasta())){
            throw new BadRequestException("La fecha desde no puede ser posterior a la fecha hasta");
        }

        return purchaseOrderRepository.findAllWithFilters(
                filter.supplierId(),
                filter.status(),
                filter.fechaDesde(),
                filter.fechaHasta(),
                filter.sede(),
                filter.area(),
                pageable
        ).map(mapper::toSummary);
    }

    @Override
    @Transactional(noRollbackFor = {PurchaseOrderEmailDispatchException.class, PurchaseOrderRecipientException.class})
    public PurchaseOrderEmailResponse sendEmail(Long orderId, PurchaseOrderEmailRequest request, Long userId) {
        PurchaseOrder order = findOrderWithDetailsOrThrow(orderId);
        findUserOrThrow(userId);
        validateOrderCanBeSent(order);

        try {
            PurchaseOrderEmailResponse response = purchaseOrderEmailService.sendPurchaseOrderEmail(order, request);
            order.setEmailStatus(PurchaseOrderEmailStatus.ENVIADO_PROVEEDOR);
            order.setStatus(Status.APROBADO);
            purchaseOrderRepository.save(order);
            return response;
        } catch (PurchaseOrderRecipientException | PurchaseOrderEmailDispatchException ex) {
            order.setEmailStatus(PurchaseOrderEmailStatus.ERROR_ENVIO);
            purchaseOrderRepository.save(order);
            throw ex;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PurchaseOrderSummary> findSentOrdersForSupplierUser(Long userId, Pageable pageable) {
        findUserOrThrow(userId);
        return purchaseOrderRepository
                .findBySupplierUserAndEmailStatus(userId, PurchaseOrderEmailStatus.ENVIADO_PROVEEDOR, pageable)
                .map(mapper::toSummary);
    }

    @Override
    @Transactional(readOnly = true)
    public PurchaseOrderResponse findSentOrderDetailForSupplierUser(Long orderId, Long userId) {
        findUserOrThrow(userId);
        PurchaseOrder order = purchaseOrderRepository.findByIdForSupplierUserWithDetails(
                        orderId,
                        userId,
                        PurchaseOrderEmailStatus.ENVIADO_PROVEEDOR
                )
                .orElseThrow(() -> new ResourceNotFoundException("Orden de compra no encontrada para el proveedor autenticado."));
        return mapper.toResponse(order);
    }

    private Map<Long, Product> loadAndValidateProducts(List<Long> productIds, Long supplierId, boolean isDraft) {

        Set<Long> seen = new HashSet<>();
        Set<Long> duplicates = productIds.stream()
                .filter(id -> !seen.add(id))
                .collect(Collectors.toSet());

        if (!duplicates.isEmpty()) {
            throw new BadRequestException(
                    "Hay productos duplicados en los detalles: " + duplicates
            );
        }

        List<Product> products = productRepository.findAllById(productIds);

        if(products.size() != productIds.size()){
            Set<Long> foundIds = products.stream().map(Product::getId).collect(Collectors.toSet());
            Set<Long> missing = productIds.stream()
                    .filter(pid -> !foundIds.contains(pid))
                    .collect(Collectors.toSet());
            throw new BadRequestException("Los siguientes productos no existen: " + missing);
        }

        if(!isDraft){
            List<Long> wrongSupplier = products.stream()
                    .filter(p -> !p.getProveedor().getId().equals(supplierId))
                    .map(Product::getId)
                    .toList();

            if(!wrongSupplier.isEmpty()){
                throw new BadRequestException(
                        "Los siguientes productos no pertenecen al proveedor seleccionado: " + wrongSupplier
                );
            }
        }

        return products.stream().collect(Collectors.toMap(Product::getId, p -> p));
    }

    private void buildAndAttachDetails(
            PurchaseOrder order,
            List<PurchaseOrderDetailRequest> detalles,
            Map<Long,Product> productMap){

        detalles.forEach(dto -> {
            Product product = productMap.get(dto.productId());

            PurchaseOrderDetail detail = PurchaseOrderDetail.builder()
                    .product(product)
                    .cantidad(dto.cantidad())
                    .precioUnitario(dto.precioUnitario())
                    .subtotal(dto.precioUnitario()
                            .multiply(BigDecimal.valueOf(dto.cantidad()))
                            .setScale(2, RoundingMode.HALF_UP))
                    .build();

            order.addDetail(detail);
        });
    }


    private void calculateTotals(PurchaseOrder order){
        BigDecimal subtotal = order.getDetails().stream()
                .map(PurchaseOrderDetail::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal igv = subtotal.multiply(IGV_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = subtotal.add(igv).setScale(2, RoundingMode.HALF_UP);

        order.setSubtotal(subtotal);
        order.setIgv(igv);
        order.setTotal(total);
    }


    private void validateDates(PurchaseOrderRequest request) {
        if (request.deliveryDate() != null
                && request.deliveryDate().isBefore(request.orderDate())) {
            throw new BadRequestException(
                    "La fecha de entrega no puede ser anterior a la fecha de la orden"
            );
        }
    }


    private void validateStatusTransition(Status current, Status next) {
        boolean valid = switch (current) {
            case BORRADOR    -> next == Status.PENDIENTE  || next == Status.CANCELADO;
            case PENDIENTE  -> next == Status.APROBADO || next == Status.CANCELADO;
            case APROBADO -> false;
            case CANCELADO -> false;
        };

        if (!valid) {
            throw new BadRequestException(
                    "Transición de estado no permitida: " + current + " → " + next
            );
        }
    }

    private void validateOrderCanBeSent(PurchaseOrder order) {
        if (order.getStatus() == Status.BORRADOR) {
            throw new BadRequestException("No se puede enviar por correo una orden en estado BORRADOR.");
        }

        if (order.getStatus() == Status.CANCELADO) {
            throw new BadRequestException("No se puede enviar por correo una orden en estado CANCELADO.");
        }

        PurchaseOrderEmailStatus emailStatus = order.getEmailStatus() != null
                ? order.getEmailStatus()
                : PurchaseOrderEmailStatus.PENDIENTE_ENVIO;
        if (emailStatus == PurchaseOrderEmailStatus.ENVIADO_PROVEEDOR) {
            throw new BadRequestException("La orden ya fue enviada al proveedor.");
        }
    }

    private String generateOrderNumber() {
        return UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 10)
                .toUpperCase();
    }

    private PurchaseOrder findOrderOrThrow(Long id) {
        return purchaseOrderRepository.findByIdWithSupplierAndUser(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Orden de compra no encontrada con ID: " + id));
    }

    private PurchaseOrder findOrderWithDetailsOrThrow(Long id) {
        return purchaseOrderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Orden de compra no encontrada con ID: " + id));
    }

    private Supplier findSupplierOrThrow(Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Proveedor no encontrado con ID: " + id));
    }

    private User findUserOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usuario no encontrado con ID: " + id));
    }
}
