package com.kong.oc.service;

import com.kong.oc.dto.PurchaseOrderResponse;
import com.kong.oc.interfaces.IPurchaseOrderService;
import com.kong.oc.model.PurchaseOrder;
import com.kong.oc.repository.PurchaseOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PurchaseOrderServiceImpl implements IPurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;

    @Transactional(readOnly = true)
    public List<PurchaseOrderResponse> listAll() {
        return purchaseOrderRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<PurchaseOrderResponse> listBySupplierId(Long supplierId) {
        return purchaseOrderRepository.findBySupplier_Id(supplierId).stream().map(this::toDto).toList();
    }

    private PurchaseOrderResponse toDto(PurchaseOrder p){
        return new PurchaseOrderResponse(
                p.getId(),
                p.getSupplier() == null ? null : p.getSupplier().getId(),
                p.getStatus(),
                p.getCreatedAt(),
                p.getDescripcion()
        );
    }
}

