package com.kong.oc.interfaces;

import com.kong.oc.dto.AreaRequest;
import com.kong.oc.dto.AreaResponse;

import java.util.List;

public interface IAreaService {
    List<AreaResponse> listAll();

    List<AreaResponse> listBySede(Long sedeId);

    AreaResponse getById(Long id);

    AreaResponse create(AreaRequest request);

    AreaResponse update(Long id, AreaRequest request);

    void delete(Long id);
}
