package com.kong.oc.service;

import com.kong.oc.common.exception.BadRequestException;
import com.kong.oc.common.exception.ResourceNotFoundException;
import com.kong.oc.dto.ProductRequest;
import com.kong.oc.dto.ProductResponse;
import com.kong.oc.interfaces.IProductService;
import com.kong.oc.model.Product;
import com.kong.oc.model.Services;
import com.kong.oc.model.Supplier;
import com.kong.oc.repository.ProductRepository;
import com.kong.oc.repository.ServicesRepository;
import com.kong.oc.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements IProductService {
    private final ProductRepository productRepository;
    private final SupplierRepository supplierRepository;
    private final ServicesRepository servicesRepository;

    @Transactional
    public ProductResponse create(ProductRequest request){
        Supplier supplier = supplierRepository.findById(request.proveedorId())
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado"));
        Services servicio = servicesRepository.findById(request.servicioId())
                .orElseThrow(() -> new ResourceNotFoundException("Servicio no encontrado"));

        validateAndNormalize(request);

        Product p = Product.builder()
                .nombre(request.nombre().trim())
                .descripcion(request.descripcion())
                .precio(request.precio())
                .proveedor(supplier)
                .servicio(servicio)
                .build();
        Product saved = productRepository.save(p);
        return toDto(saved);
    }

    @Transactional
    public ProductResponse update(Long id, ProductRequest request){
        Product p = findActiveProductById(id);
        Supplier supplier = supplierRepository.findById(request.proveedorId())
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado"));
        Services servicio = servicesRepository.findById(request.servicioId())
                .orElseThrow(() -> new ResourceNotFoundException("Servicio no encontrado"));

        validateAndNormalize(request);

        p.setNombre(request.nombre().trim());
        p.setDescripcion(request.descripcion());
        p.setPrecio(request.precio());
        p.setProveedor(supplier);
        p.setServicio(servicio);
        return toDto(p);
    }

    public ProductResponse getById(Long id) {
        return toDto(findActiveProductById(id));
    }

    public List<ProductResponse> listAll() {
        return productRepository.findByIsDeletedFalse()
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public void softdelete(Long id) {
        Product p = findActiveProductById(id);
        p.softDelete();
    }

    public List<ProductResponse> listByProveedor(Long proveedorId) {
        Supplier supplier = supplierRepository.findById(proveedorId)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado"));
        return productRepository.findByProveedorAndIsDeletedFalse(supplier)
                .stream()
                .map(this::toDto)
                .toList();
    }

    public List<ProductResponse> listByServicio(Long servicioId) {
        Services servicio = servicesRepository.findById(servicioId)
                .orElseThrow(() -> new ResourceNotFoundException("Servicio no encontrado"));
        return productRepository.findByServicioAndIsDeletedFalse(servicio)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductResponse> listByServicioAndProveedor(Long servicioId, Long proveedorId) {
        Services servicio = servicesRepository.findById(servicioId)
                .orElseThrow(() -> new ResourceNotFoundException("Servicio no encontrado"));
        Supplier supplier = supplierRepository.findById(proveedorId)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado"));

        // Validación: el proveedor debe ofrecer el servicio indicado
        if (supplier.getServicios() == null || supplier.getServicios().stream().noneMatch(s -> s.getId().equals(servicio.getId()))) {
            throw new BadRequestException("El proveedor no ofrece el servicio especificado");
        }

        return productRepository.findByServicioAndProveedorAndIsDeletedFalse(servicio, supplier)
                .stream()
                .map(this::toDto)
                .toList();
    }

    private void validateAndNormalize(ProductRequest r){
        if (r.nombre() == null || r.nombre().isBlank()){
            throw new BadRequestException("El nombre del producto es obligatorio");
        }
        if (r.precio() == null || r.precio().doubleValue() <= 0){
            throw new BadRequestException("El precio del producto debe ser mayor que 0");
        }
    }

    private ProductResponse toDto(Product p){
        return new ProductResponse(
                p.getId(),
                p.getNombre(),
                p.getPrecio(),
                p.getProveedor() == null ? null : p.getProveedor().getId(),
                p.getProveedor() == null ? null : p.getProveedor().getRuc(),
                p.getServicio() == null ? null : p.getServicio().getId(),
                p.getServicio() == null ? null : p.getServicio().getNombre()
        );
    }

    private Product findActiveProductById(Long id){
        return productRepository.findById(id)
                .filter(p -> !Boolean.TRUE.equals(p.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("El producto no existe"));
    }
}
