package com.kong.oc.repository;

import com.kong.oc.model.Sede;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SedeRepository extends JpaRepository<Sede, Long> {
    List<Sede> findByIsDeletedFalseOrderByNameAsc();
}
