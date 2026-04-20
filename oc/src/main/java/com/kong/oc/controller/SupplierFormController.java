package com.kong.oc.controller;

import com.kong.oc.dto.SupplierFormRequest;
import com.kong.oc.model.Supplier;
import com.kong.oc.service.SupplierFormService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/suppliers/form")
@RequiredArgsConstructor
public class SupplierFormController {
    private final SupplierFormService formService;

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody SupplierFormRequest req) {
        Supplier s = formService.createFromForm(req);
        // retornar mensaje de estado en lugar de DTO
        return ResponseEntity.status(HttpStatus.CREATED).body(
                Map.of("message", "Registro recibido. Email de activación enviado (o en cola). Revise su correo o la carpeta de spam." , "userId", s.getId())
        );
    }
}
