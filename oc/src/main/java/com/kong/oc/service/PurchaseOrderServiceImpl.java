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
import com.kong.oc.repository.PurchaseOrderQualityInspectionRepository;
import com.kong.oc.repository.PurchaseOrderRepository;
import com.kong.oc.repository.SupplierRepository;
import com.kong.oc.repository.AreaRepository;
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
    private final AreaRepository areaRepository;
    private final PurchaseOrderEmailService purchaseOrderEmailService;
    private final PurchaseOrderDocumentService purchaseOrderDocumentService;
    private final PurchaseOrderCompanyConfigurationService companyConfigurationService;
    private final PurchaseOrderQualityInspectionRepository qualityInspectionRepository;


    @Override
    @Transactional
    public PurchaseOrderResponse create(PurchaseOrderRequest request, Long userId){
        companyConfigurationService.assertConfigurationExists();

        boolean isDraft = Boolean.TRUE.equals(request.saveDraft());

        Supplier supplier = findSupplierOrThrow(request.supplierId());
        User user = findUserOrThrow(userId);
        Area area = findAreaOrThrow(request.areaId());

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
                .area(area)
                .notas(request.notas())
                .status(isDraft ? Status.BORRADOR : Status.PENDIENTE)
                .emailStatus(PurchaseOrderEmailStatus.PENDIENTE_ENVIO)
                .deliveryStatus(DeliveryStatus.PENDIENTE)
                .calidadStatus(CalidadStatus.PENDIENTE)
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
        companyConfigurationService.assertConfigurationExists();

        PurchaseOrder order = findOrderWithDetailsOrThrow(id);

        if(order.getStatus() != Status.BORRADOR){
            throw new BadRequestException(
                    "Solo se puede modificar órdenes en estado BORRADOR. Estado actual: " + order.getStatus()
            );
        }

        boolean isDraft = Boolean.TRUE.equals(request.saveDraft());
        Area area = findAreaOrThrow(request.areaId());

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
        order.setArea(area);
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
    @Transactional
    public PurchaseOrderResponse changeDeliveryStatus(Long id, DeliveryStatusPayload deliveryStatusDTO) {
        PurchaseOrder order = findOrderOrThrow(id);

        if (order.getStatus() != Status.APROBADO) {
            throw new BadRequestException("No se puede cambiar el estado de entrega si la orden no está APROBADA.");
        }

        validateDeliveryStatusFromSentOrders(deliveryStatusDTO.deliveryStatus());

        order.setDeliveryStatus(deliveryStatusDTO.deliveryStatus());
        order.setCalidadStatus(CalidadStatus.PENDIENTE);

        if (deliveryStatusDTO.notas() != null && !deliveryStatusDTO.notas().isBlank()) {
            String deliveryNotes = "[ENTREGA] " + deliveryStatusDTO.notas();
            order.setNotas(order.getNotas() != null
                    ? order.getNotas() + "\n" + deliveryNotes
                    : deliveryNotes);
        }

        return mapper.toResponse(purchaseOrderRepository.save(order));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PurchaseOrderSummary> findOrdersForQuality(Pageable pageable) {
        String clientName = getClientName();
        return purchaseOrderRepository.findQualityQueue(
                Status.APROBADO,
                PurchaseOrderEmailStatus.ENVIADO_PROVEEDOR,
                List.of(DeliveryStatus.RECIBIDO, DeliveryStatus.PARCIAL, DeliveryStatus.ENTREGADO_PARCIAL),
                List.of(CalidadStatus.PENDIENTE, CalidadStatus.EN_REVISION),
                pageable
        ).map(order -> mapper.toSummary(order, clientName));
    }

    @Override
    @Transactional
    public PurchaseOrderResponse changeQualityStatus(Long id, PurchaseOrderQualityStatus qualityStatusDTO) {
        PurchaseOrder order = findOrderWithDetailsOrThrow(id);

        if (order.getStatus() != Status.APROBADO) {
            throw new BadRequestException("Solo se puede revisar calidad de órdenes APROBADAS.");
        }

        if (!isQualityReviewDeliveryStatus(order.getDeliveryStatus())) {
            throw new BadRequestException("La orden debe estar RECIBIDA o PARCIAL para revisar calidad.");
        }

        validateQualityDecision(qualityStatusDTO);
        List<PurchaseOrderQualityDetailRequest> qualityDetails = resolveQualityDetails(order, qualityStatusDTO);
        validateQualityDetails(order, qualityStatusDTO, qualityDetails);

        order.setCalidadStatus(qualityStatusDTO.calidadStatus());
        order.setDeliveryStatus(qualityStatusDTO.deliveryStatus());

        if (qualityStatusDTO.motivo() != null && !qualityStatusDTO.motivo().isBlank()) {
            String qualityNotes = "[CALIDAD] " + qualityStatusDTO.motivo().trim();
            order.setNotas(order.getNotas() != null
                    ? order.getNotas() + "\n" + qualityNotes
                    : qualityNotes);
        }

        PurchaseOrder savedOrder = purchaseOrderRepository.save(order);
        saveQualityInspection(savedOrder, qualityStatusDTO, qualityDetails);

        return mapper.toResponse(savedOrder);
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

        String clientName = getClientName();

        return purchaseOrderRepository.findAllWithFilters(
                filter.supplierId(),
                filter.status(),
                filter.fechaDesde(),
                filter.fechaHasta(),
                filter.sede(),
                filter.area(),
                pageable
        ).map(order -> mapper.toSummary(order, clientName));
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
            order.setDeliveryStatus(DeliveryStatus.PENDIENTE);
            order.setCalidadStatus(CalidadStatus.PENDIENTE);
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
        Supplier supplier = findSupplierByUserOrThrow(userId);
        String clientName = getClientName();
        return purchaseOrderRepository
                .findBySupplierIdAndEmailStatus(supplier.getId(), PurchaseOrderEmailStatus.ENVIADO_PROVEEDOR, pageable)
                .map(order -> mapper.toSummary(order, clientName));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PurchaseOrderSummary> findSentOrdersForSupplier(Long supplierId, Pageable pageable) {
        findSupplierOrThrow(supplierId);
        String clientName = getClientName();
        return purchaseOrderRepository
                .findBySupplierIdAndEmailStatus(supplierId, PurchaseOrderEmailStatus.ENVIADO_PROVEEDOR, pageable)
                .map(order -> mapper.toSummary(order, clientName));
    }

    @Override
    @Transactional(readOnly = true)
    public PurchaseOrderResponse findSentOrderDetail(Long orderId, Long userId, boolean isAdmin) {
        findUserOrThrow(userId);

        PurchaseOrder order;
        if (isAdmin) {
            order = findOrderWithDetailsOrThrow(orderId);
        } else {
            Supplier supplier = findSupplierByUserOrThrow(userId);
            order = purchaseOrderRepository.findByIdForSupplierWithDetails(
                            orderId,
                            supplier.getId(),
                            PurchaseOrderEmailStatus.ENVIADO_PROVEEDOR
                    )
                    .orElseThrow(() -> new ResourceNotFoundException("Orden de compra no encontrada para el proveedor autenticado."));
        }
        return mapper.toResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public PurchaseOrderPdfDownload downloadPdf(Long orderId, Long userId, boolean isAdmin) {
        findUserOrThrow(userId);

        PurchaseOrder order;
        if (isAdmin) {
            order = findOrderWithDetailsOrThrow(orderId);
        } else {
            Supplier supplier = findSupplierByUserOrThrow(userId);
            order = purchaseOrderRepository.findByIdForSupplierWithDetails(
                            orderId,
                            supplier.getId(),
                            PurchaseOrderEmailStatus.ENVIADO_PROVEEDOR
                    )
                    .orElseThrow(() -> new ResourceNotFoundException("Orden de compra no encontrada para el proveedor autenticado."));
        }

        PurchaseOrderDocumentService.PreparedPurchaseOrderPdf preparedPdf = purchaseOrderDocumentService.preparePdf(order);
        return new PurchaseOrderPdfDownload(preparedPdf.fileName(), preparedPdf.content());
    }

    private String getClientName() {
        var config = companyConfigurationService.getConfiguration();
        return config != null ? config.companyName() : "Empresa Emisora";
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
            case CERRADA -> false;
        };

        if (!valid) {
            throw new BadRequestException(
                    "Transición de estado no permitida: " + current + " → " + next
            );
        }
    }

    private void validateDeliveryStatusFromSentOrders(DeliveryStatus deliveryStatus) {
        boolean valid = deliveryStatus == DeliveryStatus.RECIBIDO
                || deliveryStatus == DeliveryStatus.PARCIAL
                || deliveryStatus == DeliveryStatus.ENTREGADO_PARCIAL;

        if (!valid) {
            throw new BadRequestException("Desde pedidos enviados solo se puede marcar la entrega como RECIBIDO o PARCIAL.");
        }
    }

    private boolean isQualityReviewDeliveryStatus(DeliveryStatus deliveryStatus) {
        return deliveryStatus == DeliveryStatus.RECIBIDO
                || deliveryStatus == DeliveryStatus.PARCIAL
                || deliveryStatus == DeliveryStatus.ENTREGADO_PARCIAL;
    }

    private void validateQualityDecision(PurchaseOrderQualityStatus qualityStatusDTO) {
        CalidadStatus calidadStatus = qualityStatusDTO.calidadStatus();
        DeliveryStatus deliveryStatus = qualityStatusDTO.deliveryStatus();

        boolean validPair = switch (calidadStatus) {
            case APROBADO -> deliveryStatus == DeliveryStatus.COMPLETO;
            case OBSERVADO -> deliveryStatus == DeliveryStatus.COMPLETO || deliveryStatus == DeliveryStatus.PARCIAL;
            case PARCIAL -> deliveryStatus == DeliveryStatus.PARCIAL;
            case RECHAZADO -> deliveryStatus == DeliveryStatus.COMPLETO;
            case PENDIENTE, EN_REVISION -> false;
        };

        if (!validPair) {
            throw new BadRequestException("La combinación de estado de calidad y entrega no es válida para el flujo de calidad.");
        }
    }

    private List<PurchaseOrderQualityDetailRequest> resolveQualityDetails(
            PurchaseOrder order,
            PurchaseOrderQualityStatus qualityStatusDTO
    ) {
        if (qualityStatusDTO.calidadStatus() == CalidadStatus.APROBADO) {
            return order.getDetails().stream()
                    .map(detail -> new PurchaseOrderQualityDetailRequest(
                            detail.getId(),
                            detail.getCantidad(),
                            0,
                            null
                    ))
                    .toList();
        }

        if (qualityStatusDTO.details() == null || qualityStatusDTO.details().isEmpty()) {
            throw new BadRequestException("Debe registrar el detalle de cantidades revisadas por producto.");
        }

        return qualityStatusDTO.details();
    }

    private void validateQualityDetails(
            PurchaseOrder order,
            PurchaseOrderQualityStatus qualityStatusDTO,
            List<PurchaseOrderQualityDetailRequest> qualityDetails
    ) {
        Map<Long, PurchaseOrderDetail> orderDetails = order.getDetails().stream()
                .collect(Collectors.toMap(PurchaseOrderDetail::getId, detail -> detail));

        Set<Long> seen = new HashSet<>();
        for (PurchaseOrderQualityDetailRequest detailDTO : qualityDetails) {
            if (!seen.add(detailDTO.purchaseOrderDetailId())) {
                throw new BadRequestException("Hay productos duplicados en el detalle de calidad.");
            }

            PurchaseOrderDetail orderDetail = orderDetails.get(detailDTO.purchaseOrderDetailId());
            if (orderDetail == null) {
                throw new BadRequestException("El detalle de calidad no pertenece a la orden de compra.");
            }

            int reviewedQuantity = detailDTO.acceptedQuantity() + detailDTO.rejectedQuantity();
            if (reviewedQuantity > orderDetail.getCantidad()) {
                throw new BadRequestException("Las cantidades revisadas superan la cantidad pedida para el producto "
                        + orderDetail.getProduct().getNombre());
            }

            boolean lineNotFullyApproved = detailDTO.acceptedQuantity() < orderDetail.getCantidad();
            if (lineNotFullyApproved && (detailDTO.motivo() == null || detailDTO.motivo().isBlank())) {
                throw new BadRequestException("Debe indicar la razón para el producto "
                        + orderDetail.getProduct().getNombre()
                        + " porque no se aprobó toda la cantidad pedida.");
            }
        }

        if (!seen.equals(orderDetails.keySet())) {
            throw new BadRequestException("Debe revisar todos los productos de la orden de compra.");
        }

        int orderedTotal = order.getDetails().stream().mapToInt(PurchaseOrderDetail::getCantidad).sum();
        int acceptedTotal = qualityDetails.stream().mapToInt(PurchaseOrderQualityDetailRequest::acceptedQuantity).sum();
        int rejectedTotal = qualityDetails.stream().mapToInt(PurchaseOrderQualityDetailRequest::rejectedQuantity).sum();
        int reviewedTotal = acceptedTotal + rejectedTotal;

        switch (qualityStatusDTO.calidadStatus()) {
            case APROBADO -> {
                if (acceptedTotal != orderedTotal || rejectedTotal != 0) {
                    throw new BadRequestException("Para Todo Ok, todos los productos deben quedar aceptados y sin rechazos.");
                }
            }
            case OBSERVADO -> {
                if (rejectedTotal <= 0) {
                    throw new BadRequestException("Para OBSERVADO debe existir al menos una cantidad rechazada.");
                }
                if (qualityStatusDTO.deliveryStatus() == DeliveryStatus.COMPLETO && reviewedTotal != orderedTotal) {
                    throw new BadRequestException("Para rechazo parcial con entrega completa, todas las cantidades deben estar aceptadas o rechazadas.");
                }
                if (qualityStatusDTO.deliveryStatus() == DeliveryStatus.PARCIAL && reviewedTotal >= orderedTotal) {
                    throw new BadRequestException("Para entrega incompleta con rechazo, debe quedar cantidad pendiente de entrega.");
                }
            }
            case PARCIAL -> {
                if (rejectedTotal != 0) {
                    throw new BadRequestException("Para entrega incompleta sin rechazo no debe haber cantidades rechazadas.");
                }
                if (acceptedTotal <= 0 || acceptedTotal >= orderedTotal) {
                    throw new BadRequestException("Para entrega incompleta debe aceptarse una cantidad menor a la cantidad pedida.");
                }
            }
            case RECHAZADO -> {
                if (acceptedTotal != 0 || rejectedTotal != orderedTotal) {
                    throw new BadRequestException("Para rechazo total, todas las cantidades deben quedar rechazadas.");
                }
            }
            case PENDIENTE, EN_REVISION -> throw new BadRequestException("El resultado de calidad seleccionado no es final.");
        }
    }

    private void saveQualityInspection(
            PurchaseOrder order,
            PurchaseOrderQualityStatus qualityStatusDTO,
            List<PurchaseOrderQualityDetailRequest> qualityDetails
    ) {
        PurchaseOrderQualityInspection inspection = qualityInspectionRepository
                .findByPurchaseOrderId(order.getId())
                .orElseGet(() -> PurchaseOrderQualityInspection.builder()
                        .purchaseOrder(order)
                        .build());

        Map<Long, PurchaseOrderDetail> orderDetails = order.getDetails().stream()
                .collect(Collectors.toMap(PurchaseOrderDetail::getId, detail -> detail));

        inspection.setCalidadStatus(qualityStatusDTO.calidadStatus());
        inspection.setDeliveryStatus(qualityStatusDTO.deliveryStatus());
        inspection.setMotivo(qualityStatusDTO.motivo());
        inspection.getDetails().clear();

        qualityDetails.forEach(detailDTO -> {
            PurchaseOrderDetail orderDetail = orderDetails.get(detailDTO.purchaseOrderDetailId());
            inspection.addDetail(PurchaseOrderQualityInspectionDetail.builder()
                    .purchaseOrderDetail(orderDetail)
                    .orderedQuantity(orderDetail.getCantidad())
                    .acceptedQuantity(detailDTO.acceptedQuantity())
                    .rejectedQuantity(detailDTO.rejectedQuantity())
                    .motivo(detailDTO.motivo())
                    .build());
        });

        qualityInspectionRepository.save(inspection);
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

    private Supplier findSupplierByUserOrThrow(Long userId) {
        return supplierRepository.findByUser_Id(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No se encontró un proveedor asociado al usuario autenticado."));
    }

    private Area findAreaOrThrow(Long areaId) {
        Area area = areaRepository.findById(areaId)
                .filter(value -> !Boolean.TRUE.equals(value.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Área no encontrada con ID: " + areaId));

        if (Boolean.TRUE.equals(area.getSede().getIsDeleted())) {
            throw new BadRequestException("El área seleccionada pertenece a una sede inactiva.");
        }

        return area;
    }

    private User findUserOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usuario no encontrado con ID: " + id));
    }
}
