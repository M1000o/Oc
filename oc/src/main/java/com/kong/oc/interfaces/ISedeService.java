package com.kong.oc.interfaces;

import com.kong.oc.dto.SedeRequest;
import com.kong.oc.dto.SedeResponse;

import java.util.List;

public interface ISedeService {
    List<SedeResponse> listAll();

    SedeResponse getById(Long id);

    SedeResponse create(SedeRequest request);

    SedeResponse update(Long id, SedeRequest request);

    void delete(Long id);
}
