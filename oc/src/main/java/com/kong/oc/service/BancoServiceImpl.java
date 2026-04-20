package com.kong.oc.service;

import com.kong.oc.common.exception.BadRequestException;
import com.kong.oc.common.exception.ResourceNotFoundException;
import com.kong.oc.dto.BankRequest;
import com.kong.oc.dto.BankResponse;
import com.kong.oc.interfaces.IBanksService;
import com.kong.oc.model.Banks;
import com.kong.oc.repository.BanksRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BancoServiceImpl implements IBanksService {

    private final BanksRepository banksRepository;

    @Transactional
    public BankResponse create(BankRequest request){

        String normalicedBanco = validateAndNormalizeName(request.banco());

        if(banksRepository.existsByBancoIgnoreCaseAndIsDeletedFalse(request.banco())){
            throw new BadRequestException("El banco ya existe");
        }

        Banks b = Banks.builder()
                .banco(normalicedBanco)
                .build();

        banksRepository.save(b);
        return toDto(b);
    }

    @Transactional
    public BankResponse update(Long id, BankRequest request){

        Banks b = findActiveBankById(id);

        String normalicedBanco = validateAndNormalizeName(request.banco());

        b.setBanco(normalicedBanco);

        return toDto(b);
    }

    public BankResponse getById(Long id) {
        return toDto(findActiveBankById(id));
    }

    public List<BankResponse> listAll() {
        return banksRepository.findByIsDeletedFalse()
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public void softdelete(Long id) {
        Banks b = findActiveBankById(id);
        b.softDelete();
    }

    private String validateAndNormalizeName(String name) {
        String normalized = normalize(name);
        if (normalized == null || normalized.isBlank()) {
            throw new BadRequestException("El nombre de la familia es obligatorio");
        }
        return normalized;
    }

    private String normalize(String input){
        return input == null ? null : input.trim().replaceAll("\\s+"," ");
    }

    private BankResponse toDto(Banks b){
        return new BankResponse(
                b.getId(),
                b.getBanco()
        );
    }

    private Banks findActiveBankById(Long id) {
        return banksRepository.findById(id)
                .filter(b -> !Boolean.TRUE.equals(b.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("El banco no existe"));
    }

}

