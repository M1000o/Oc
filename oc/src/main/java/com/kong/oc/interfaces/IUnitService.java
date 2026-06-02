package com.kong.oc.interfaces;

import com.kong.oc.dto.UnitRequest;
import com.kong.oc.dto.UnitResponse;

import java.util.List;

public interface IUnitService {
    List<UnitResponse> listAll();

    UnitResponse getById(Long id);

    UnitResponse create(UnitRequest request);

    UnitResponse update(Long id, UnitRequest request);

    void delete(Long id);
}
