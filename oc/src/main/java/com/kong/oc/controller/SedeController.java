package com.kong.oc.controller;

import com.kong.oc.dto.ApiResponse;
import com.kong.oc.dto.SedeResponse;
import com.kong.oc.interfaces.ISedeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
