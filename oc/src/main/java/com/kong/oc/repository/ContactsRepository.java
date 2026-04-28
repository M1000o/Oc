package com.kong.oc.repository;

import com.kong.oc.model.Contacts;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ContactsRepository extends JpaRepository<Contacts, Long> {
    Optional<Contacts> findFirstBySupplier_IdAndIsDeletedFalseOrderByIdAsc(Long supplierId);
}
