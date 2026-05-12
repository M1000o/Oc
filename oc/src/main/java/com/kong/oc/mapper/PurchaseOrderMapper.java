package com.kong.oc.mapper;

import com.kong.oc.dto.PurchaseOrderDetailResponse;
import com.kong.oc.dto.PurchaseOrderResponse;
import com.kong.oc.dto.PurchaseOrderSummary;
import com.kong.oc.dto.PurchaseOrderEmailStatus;
import com.kong.oc.model.PurchaseOrder;
import com.kong.oc.model.PurchaseOrderDetail;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PurchaseOrderMapper {

    public PurchaseOrderResponse toResponse(PurchaseOrder order){
        return new PurchaseOrderResponse(
                order.getId(),
                order.getPurchaseOrderNumber(),
                order.getSupplier().getId(),
                order.getSupplier().getRuc(),
                order.getSupplier().getRazonSocial(),
                order.getOrderDate(),
                order.getDeliveryDate(),
                order.getSede().getId(),
                order.getSede().getName(),
                order.getArea().getId(),
                order.getArea().getNombre(),
                order.getStatus().name(),
                resolveEmailStatus(order),
                order.getNotas(),
                order.getUsuario().getUsername(),
                order.getSubtotal(),
                order.getIgv(),
                order.getTotal(),
                toDetailResponseList(order.getDetails())
        );
    }

    public PurchaseOrderSummary toSummary(PurchaseOrder order){
        return new PurchaseOrderSummary(
                order.getId(),
                order.getPurchaseOrderNumber(),
                order.getSupplier().getRazonSocial(),
                order.getOrderDate(),
                order.getDeliveryDate(),
                order.getSede().getId(),
                order.getSede().getName(),
                order.getArea().getId(),
                order.getArea().getNombre(),
                order.getStatus().name(),
                resolveEmailStatus(order),
                order.getTotal()
        );
    }

    public PurchaseOrderDetailResponse toDetailResponse(PurchaseOrderDetail detail){
        return new PurchaseOrderDetailResponse(
                detail.getId(),
                detail.getProduct().getId(),
                detail.getProduct().getCodigoProducto(),
                detail.getProduct().getNombre(),
                detail.getProduct().getUnd_medida().name(),
                detail.getCantidad(),
                detail.getPrecioUnitario(),
                detail.getSubtotal()
        );
    }

    public List<PurchaseOrderDetailResponse> toDetailResponseList(List<PurchaseOrderDetail> details){
        return details.stream()
                .map(this::toDetailResponse)
                .toList();
    }

    private String resolveEmailStatus(PurchaseOrder order) {
        return order.getEmailStatus() != null
                ? order.getEmailStatus().name()
                : PurchaseOrderEmailStatus.PENDIENTE_ENVIO.name();
    }
}
