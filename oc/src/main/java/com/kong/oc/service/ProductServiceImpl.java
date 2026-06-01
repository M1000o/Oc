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

        String normalizedName = request.nombre() == null ? "" : request.nombre().trim();
        String normalizedProductCode = normalizeProductCode(request.codigo_producto());
        validateRequest(request, normalizedName, normalizedProductCode, null);

        Product p = Product.builder()
                .codigoProducto(normalizedProductCode)
                .nombre(normalizedName)
                .descripcion(request.descripcion())
                .precio(request.precio())
                .und_medida(request.und_medida())
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

        String normalizedName = request.nombre() == null ? "" : request.nombre().trim();
        String normalizedProductCode = normalizeProductCode(request.codigo_producto());
        validateRequest(request, normalizedName, normalizedProductCode, p.getId());

        p.setCodigoProducto(normalizedProductCode);
        p.setNombre(normalizedName);
        p.setDescripcion(request.descripcion());
        p.setPrecio(request.precio());
        p.setUnd_medida(request.und_medida());
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

    private void validateRequest(ProductRequest request, String normalizedName, String normalizedProductCode, Long currentProductId){
        if (normalizedName.isBlank()){
            throw new BadRequestException("El nombre del producto es obligatorio");
        }
        if (request.und_medida() == null) {
            throw new BadRequestException("La unidad de medida es obligatoria");
        }

        productRepository.findByCodigoProductoIgnoreCaseAndIsDeletedFalse(normalizedProductCode)
                .filter(existing -> !existing.getId().equals(currentProductId))
                .ifPresent(existing -> {
                    throw new BadRequestException("El codigo del producto ya existe");
                });
    }

    private String normalizeProductCode(String value) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException("El codigo del producto es obligatorio");
        }
        return value.trim().toUpperCase();
    }

    private ProductResponse toDto(Product p){
        return new ProductResponse(
                p.getId(),
                p.getCodigoProducto(),
                p.getNombre(),
                p.getPrecio(),
                p.getProveedor() == null ? null : p.getProveedor().getId(),
                p.getProveedor() == null ? null : p.getProveedor().getRuc(),
                p.getProveedor() == null ? null : p.getProveedor().getRazonSocial(),
                p.getUnd_medida() == null ? null : p.getUnd_medida().name(),
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
