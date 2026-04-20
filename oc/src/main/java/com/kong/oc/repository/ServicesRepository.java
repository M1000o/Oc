package com.kong.oc.repository;

import com.kong.oc.model.Services;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServicesRepository extends JpaRepository<Services, Long> {
     Services findByNombre(String nombre);
     boolean existsByNombreIgnoreCaseAndIsDeletedFalse(String nombre);
     List<Services> findByIsDeletedFalse();
}
