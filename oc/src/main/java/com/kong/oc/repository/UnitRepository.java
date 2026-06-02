package com.kong.oc.repository;

import com.kong.oc.model.Unit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UnitRepository extends JpaRepository<Unit, Long> {
    List<Unit> findByIsDeletedFalseOrderByNombreAsc();

    Optional<Unit> findByCodigoIgnoreCaseAndIsDeletedFalse(String codigo);
}
