package com.kong.oc.repository;

import com.kong.oc.model.Banks;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BanksRepository extends JpaRepository<Banks, Long> {
    Banks findByBanco(String name);
    boolean existsByBancoIgnoreCaseAndIsDeletedFalse(String banco);
    List<Banks> findByIsDeletedFalse();
}
