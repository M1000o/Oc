package com.kong.oc.service;

import com.kong.oc.common.exception.ResourceNotFoundException;
import com.kong.oc.dto.ProductRequest;
import com.kong.oc.dto.ProductResponse;
import com.kong.oc.model.Product;
import com.kong.oc.model.Services;
import com.kong.oc.model.Supplier;
import com.kong.oc.repository.ProductRepository;
import com.kong.oc.repository.ServicesRepository;
import com.kong.oc.repository.SupplierRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductServiceImplTest {

    @Mock
    ProductRepository productRepository;
    @Mock
    SupplierRepository supplierRepository;
    @Mock
    ServicesRepository servicesRepository;

    @InjectMocks
    ProductServiceImpl productService;

    @Captor
    ArgumentCaptor<Product> productCaptor;

    Supplier supplier;
    Services servicio;

    @BeforeEach
    void setUp(){
        supplier = new Supplier();
        supplier.setId(1L);
        supplier.setRuc("12345678901");
        servicio = new Services();
        servicio.setId(2L);
        servicio.setNombre("Categoria X");
    }

    @Test
    void create_success() {
        when(supplierRepository.findById(1L)).thenReturn(Optional.of(supplier));
        when(servicesRepository.findById(2L)).thenReturn(Optional.of(servicio));

        ProductRequest req = new ProductRequest("Producto A", "Desc", new BigDecimal("10.5"), 1L, 2L);

        Product saved = Product.builder()
                .id(5L)
                .nombre(req.nombre())
                .descripcion(req.descripcion())
                .precio(req.precio())
                .proveedor(supplier)
                .servicio(servicio)
                .build();
        when(productRepository.save(any())).thenReturn(saved);

        ProductResponse resp = productService.create(req);

        verify(productRepository).save(productCaptor.capture());
        Product cap = productCaptor.getValue();
        assertEquals("Producto A", cap.getNombre());
        assertEquals(supplier, cap.getProveedor());
        assertEquals(servicio, cap.getServicio());

        assertNotNull(resp);
        assertEquals(saved.getId(), resp.id());
        assertEquals(saved.getNombre(), resp.nombre());
        assertEquals(saved.getPrecio(), resp.precio());
    }

    @Test
    void create_supplierNotFound_throws() {
        when(supplierRepository.findById(1L)).thenReturn(Optional.empty());
        ProductRequest req = new ProductRequest("p","d", new BigDecimal("1"), 1L, 2L);
        assertThrows(ResourceNotFoundException.class, () -> productService.create(req));
    }
}

