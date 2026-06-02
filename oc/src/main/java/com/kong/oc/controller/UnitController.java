package com.kong.oc.controller;

import com.kong.oc.dto.ApiResponse;
import com.kong.oc.dto.UnitRequest;
import com.kong.oc.dto.UnitResponse;
import com.kong.oc.interfaces.IUnitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/units")
public class UnitController {

    private final IUnitService unitService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<UnitResponse>>> listAll() {
        return ResponseEntity.ok(new ApiResponse<>("Unidades de medida obtenidas exitosamente", unitService.listAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UnitResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(new ApiResponse<>("Unidad de medida obtenida exitosamente", unitService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UnitResponse>> create(@Valid @RequestBody UnitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>("Unidad de medida creada exitosamente", unitService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UnitResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UnitRequest request
    ) {
        return ResponseEntity.ok(new ApiResponse<>("Unidad de medida actualizada exitosamente", unitService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        unitService.delete(id);
        return ResponseEntity.ok(new ApiResponse<>("Unidad de medida eliminada exitosamente", null));
    }
}
