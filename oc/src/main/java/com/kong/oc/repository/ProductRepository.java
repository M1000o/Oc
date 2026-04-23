package com.kong.oc.repository;

import com.kong.oc.model.Product;
import com.kong.oc.model.Services;
import com.kong.oc.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByProveedorAndIsDeletedFalse(Supplier proveedor);
    List<Product> findByServicioAndIsDeletedFalse(Services servicio);
    List<Product> findByServicioAndProveedorAndIsDeletedFalse(Services servicio, Supplier proveedor);
    List<Product> findByIsDeletedFalse();
    Optional<Product> findByCodigoProductoIgnoreCaseAndIsDeletedFalse(String codigoProducto);
}
