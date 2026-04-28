package com.kong.oc.service;

import com.kong.oc.common.exception.BadRequestException;
import com.kong.oc.dto.PurchaseOrderDetailRequest;
import com.kong.oc.dto.PurchaseOrderRequest;
import com.kong.oc.dto.PurchaseOrderResponse;
import com.kong.oc.dto.Status;
import com.kong.oc.model.PurchaseOrder;
import com.kong.oc.model.Services;
import com.kong.oc.model.Supplier;
import com.kong.oc.repository.PurchaseOrderRepository;
import com.kong.oc.repository.ServicesRepository;
import com.kong.oc.repository.SupplierRepository;
import com.kong.oc.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertIterableEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PurchaseOrderServiceImplTest {

//    @Mock
//    PurchaseOrderRepository purchaseOrderRepository;
//    @Mock
//    SupplierRepository supplierRepository;
//    @Mock
//    ServicesRepository servicesRepository;
//    @Mock
//    UserRepository userRepository;
//
//    @InjectMocks
//    PurchaseOrderServiceImpl purchaseOrderService;
//
//    @Captor
//    ArgumentCaptor<PurchaseOrder> purchaseOrderCaptor;
//
//    Supplier supplier;
//    Services serviceA;
//    Services serviceB;
//    Services foreignService;
//
//    @BeforeEach
//    void setUp() {
//        serviceA = new Services();
//        serviceA.setId(10L);
//        serviceA.setNombre("Carnes");
//
//        serviceB = new Services();
//        serviceB.setId(20L);
//        serviceB.setNombre("Abarrotes");
//
//        foreignService = new Services();
//        foreignService.setId(30L);
//        foreignService.setNombre("Limpieza");
//
//        supplier = new Supplier();
//        supplier.setId(1L);
//        supplier.setRuc("12345678901");
//        supplier.setRazonSocial("Proveedor Uno");
//        supplier.setServicios(List.of(serviceA, serviceB));
//    }
//
//    @Test
//    void create_withMultipleServicesFromSameSupplier_savesOrder() {
//        PurchaseOrderRequest request = new PurchaseOrderRequest(
//                "OC-20260423-0001",
//                serviceA.getId(),
//                List.of(serviceA.getId(), serviceB.getId()),
//                supplier.getId(),
//                LocalDate.now().plusDays(2),
//                "Planta Central - Lima",
//                "Area de Recepcion Principal",
//                Status.PENDIENTE
//        );
//
//        when(supplierRepository.findById(supplier.getId())).thenReturn(Optional.of(supplier));
//        when(servicesRepository.findById(serviceA.getId())).thenReturn(Optional.of(serviceA));
//        when(servicesRepository.findById(serviceB.getId())).thenReturn(Optional.of(serviceB));
//        when(purchaseOrderRepository.save(any())).thenAnswer(invocation -> {
//            PurchaseOrder purchaseOrder = invocation.getArgument(0);
//            purchaseOrder.setId(99L);
//            return purchaseOrder;
//        });
//
//        PurchaseOrderResponse response = purchaseOrderService.create(request, null);
//
//        verify(purchaseOrderRepository).save(purchaseOrderCaptor.capture());
//        PurchaseOrder savedOrder = purchaseOrderCaptor.getValue();
//
//        assertEquals(supplier, savedOrder.getSupplier());
//        assertIterableEquals(List.of(serviceA, serviceB), savedOrder.getService());
//        assertIterableEquals(List.of(serviceA.getId(), serviceB.getId()), response.serviceIds());
//    }
//
//    @Test
//    void create_withServiceFromOtherSupplier_throwsBadRequest() {
//        PurchaseOrderRequest request = new PurchaseOrderRequest(
//                "OC-20260423-0001",
//                serviceA.getId(),
//                List.of(serviceA.getId(), foreignService.getId()),
//                supplier.getId(),
//                LocalDate.now().plusDays(2),
//                "Planta Central - Lima",
//                "Area de Recepcion Principal",
//                Status.PENDIENTE,
//                List.of(new PurchaseOrderDetailRequest("Producto A", 3)),
//                null
//        );
//
//        when(supplierRepository.findById(supplier.getId())).thenReturn(Optional.of(supplier));
//        when(servicesRepository.findById(serviceA.getId())).thenReturn(Optional.of(serviceA));
//        when(servicesRepository.findById(foreignService.getId())).thenReturn(Optional.of(foreignService));
//
//        BadRequestException exception = assertThrows(
//                BadRequestException.class,
//                () -> purchaseOrderService.create(request, null)
//        );
//
//        assertEquals("Todos los servicios seleccionados deben pertenecer al mismo proveedor", exception.getMessage());
//        verify(purchaseOrderRepository, never()).save(any());
//    }
}
