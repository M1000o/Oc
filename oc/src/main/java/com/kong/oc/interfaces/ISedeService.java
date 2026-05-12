package com.kong.oc.interfaces;

import com.kong.oc.dto.SedeResponse;

import java.util.List;

public interface ISedeService {
    List<SedeResponse> listAll();

    SedeResponse getById(Long id);
}
