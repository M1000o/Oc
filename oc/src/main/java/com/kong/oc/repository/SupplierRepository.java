package com.kong.oc.repository;

import com.kong.oc.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    Optional<Supplier> findByRuc(String ruc);
    Optional<Supplier> findByRazonSocial(String razonSocial);
    Optional<Supplier> findByUser_Id(Long userId);
    List<Supplier> findByServicios_IdAndIsDeletedFalse(Long servicioId);
    Optional<Supplier> findByIdAndIsDeletedFalse(Long id);
}
