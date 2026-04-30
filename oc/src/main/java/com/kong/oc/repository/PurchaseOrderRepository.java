package com.kong.oc.repository;

import com.kong.oc.dto.Status;
import com.kong.oc.dto.PurchaseOrderEmailStatus;
import com.kong.oc.model.PurchaseOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {
    boolean existsByPurchaseOrderNumber(String purchaseOrderNumber);




    // Buscar con supplier y createdBy ya cargados (evita N+1 en detalle)
    @Query("""
            SELECT po FROM PurchaseOrder po
            JOIN FETCH po.supplier
            JOIN FETCH po.usuario
            WHERE po.id = :id
            """)
    Optional<PurchaseOrder> findByIdWithSupplierAndUser(@Param("id") Long id);

    // Buscar con todos los detalles y productos cargados (para el detalle completo)
    @Query("""
            SELECT DISTINCT po FROM PurchaseOrder po
            JOIN FETCH po.supplier
            JOIN FETCH po.usuario
            LEFT JOIN FETCH po.details d
            LEFT JOIN FETCH d.product
            WHERE po.id = :id
            """)
    Optional<PurchaseOrder> findByIdWithDetails(@Param("id") Long id);

    @Query("""
            SELECT po FROM PurchaseOrder po
            JOIN FETCH po.supplier s
            JOIN FETCH po.usuario u
            WHERE s.user.id = :userId
              AND po.emailStatus = :emailStatus
            """)
    Page<PurchaseOrder> findBySupplierUserAndEmailStatus(
            @Param("userId") Long userId,
            @Param("emailStatus") PurchaseOrderEmailStatus emailStatus,
            Pageable pageable
    );

    @Query("""
            SELECT DISTINCT po FROM PurchaseOrder po
            JOIN FETCH po.supplier s
            JOIN FETCH po.usuario u
            LEFT JOIN FETCH po.details d
            LEFT JOIN FETCH d.product
            WHERE po.id = :orderId
              AND s.user.id = :userId
              AND po.emailStatus = :emailStatus
            """)
    Optional<PurchaseOrder> findByIdForSupplierUserWithDetails(
            @Param("orderId") Long orderId,
            @Param("userId") Long userId,
            @Param("emailStatus") PurchaseOrderEmailStatus emailStatus
    );


    // Listado paginado con filtros opcionales
    @Query("""
            SELECT po FROM PurchaseOrder po
            JOIN FETCH po.supplier s
            JOIN FETCH po.usuario u
            WHERE (:proveedorId  IS NULL OR s.id            = :proveedorId)
              AND (:status       IS NULL OR po.status       = :status)
              AND (:fechaDesde   IS NULL OR po.orderDate   >= :fechaDesde)
              AND (:fechaHasta   IS NULL OR po.orderDate   <= :fechaHasta)
              AND (:sede         IS NULL OR po.sede         = :sede)
              AND (:area         IS NULL OR po.area         = :area)
            """)
    Page<PurchaseOrder> findAllWithFilters(
            @Param("proveedorId") Long proveedorId,
            @Param("status") Status status,
            @Param("fechaDesde") LocalDate fechaDesde,
            @Param("fechaHasta")  LocalDate fechaHasta,
            @Param("sede")        String sede,
            @Param("area")        String area,
            Pageable pageable
    );

    // Órdenes de un proveedor (útil para validaciones cruzadas)
    boolean existsBySupplierIdAndStatus(Long supplierId, Status status);

}
