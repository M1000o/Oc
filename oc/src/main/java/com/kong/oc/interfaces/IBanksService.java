package com.kong.oc.interfaces;

import com.kong.oc.dto.BankRequest;
import com.kong.oc.dto.BankResponse;

import java.util.List;

public interface IBanksService {

    BankResponse create(BankRequest request);
    BankResponse update(Long id, BankRequest request);
    BankResponse getById(Long id);
    List<BankResponse> listAll();
    void softdelete(Long id);
}
