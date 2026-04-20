package com.kong.oc.repository;

import com.kong.oc.model.CuentasBancarias;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CuentasBancariasRepository extends JpaRepository<CuentasBancarias, Long> {
}
