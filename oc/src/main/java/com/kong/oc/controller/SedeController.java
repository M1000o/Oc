package com.kong.oc.controller;

import com.kong.oc.dto.ApiResponse;
import com.kong.oc.dto.SedeRequest;
import com.kong.oc.dto.SedeResponse;
import com.kong.oc.interfaces.ISedeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/sedes")
public class SedeController {

    private final ISedeService sedeService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SedeResponse>>> listAll() {
        return ResponseEntity.ok(new ApiResponse<>("Sedes obtenidas exitosamente", sedeService.listAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SedeResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(new ApiResponse<>("Sede obtenida exitosamente", sedeService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SedeResponse>> create(@Valid @RequestBody SedeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>("Sede creada exitosamente", sedeService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SedeResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody SedeRequest request
    ) {
        return ResponseEntity.ok(new ApiResponse<>("Sede actualizada exitosamente", sedeService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        sedeService.delete(id);
        return ResponseEntity.ok(new ApiResponse<>("Sede eliminada exitosamente", null));
    }
}
