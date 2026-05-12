package com.kong.oc.controller;

import com.kong.oc.dto.ApiResponse;
import com.kong.oc.dto.AreaResponse;
import com.kong.oc.interfaces.IAreaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
}
