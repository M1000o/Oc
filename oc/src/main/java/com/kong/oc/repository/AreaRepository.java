package com.kong.oc.repository;

import com.kong.oc.model.Area;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AreaRepository extends JpaRepository<Area, Long>{
    List<Area> findByIsDeletedFalseOrderByNombreAsc();

    List<Area> findBySede_IdAndIsDeletedFalseOrderByNombreAsc(Long sedeId);
}
