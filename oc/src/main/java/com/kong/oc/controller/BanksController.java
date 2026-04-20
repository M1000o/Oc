package com.kong.oc.controller;

import com.kong.oc.dto.ApiResponse;
import com.kong.oc.dto.BankRequest;
import com.kong.oc.dto.BankResponse;
import com.kong.oc.interfaces.IBanksService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/banks")
public class BanksController {

    private final IBanksService banksService;

    @PostMapping
    public ResponseEntity<ApiResponse<BankResponse>> create(@Valid @RequestBody BankRequest request){
        return ResponseEntity.ok(new ApiResponse<>("Banco creado exitosamente", banksService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<BankResponse>> update(@PathVariable Long id, @Valid @RequestBody BankRequest request){
        return ResponseEntity.ok(new ApiResponse<>("Banco actualizado exitosamente", banksService.update(id, request)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BankResponse>> getById(@PathVariable Long id){
        return ResponseEntity.ok(new ApiResponse<>("Banco obtenido exitosamente", banksService.getById(id)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<BankResponse>>> listAll(){
        return ResponseEntity.ok(new ApiResponse<>("Bancos obtenidos exitosamente", banksService.listAll()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id){
        banksService.softdelete(id);
        return ResponseEntity.ok(new ApiResponse<>("Banco eliminado exitosamente", null));
    }

}
