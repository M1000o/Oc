package com.kong.oc.controller;

import com.kong.oc.dto.ApiResponse;
import com.kong.oc.dto.AreaRequest;
import com.kong.oc.dto.AreaResponse;
import com.kong.oc.interfaces.IAreaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/areas")
public class AreaController {

    private final IAreaService areaService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AreaResponse>>> listAll(
            @RequestParam(required = false) Long sedeId
    ) {
        List<AreaResponse> areas = sedeId == null
                ? areaService.listAll()
                : areaService.listBySede(sedeId);
        return ResponseEntity.ok(new ApiResponse<>("Áreas obtenidas exitosamente", areas));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AreaResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(new ApiResponse<>("Área obtenida exitosamente", areaService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AreaResponse>> create(@Valid @RequestBody AreaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>("Área creada exitosamente", areaService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AreaResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody AreaRequest request
    ) {
        return ResponseEntity.ok(new ApiResponse<>("Área actualizada exitosamente", areaService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        areaService.delete(id);
        return ResponseEntity.ok(new ApiResponse<>("Área eliminada exitosamente", null));
    }
}
