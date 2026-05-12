package com.kong.oc.service;

import com.kong.oc.common.exception.BadRequestException;
import com.kong.oc.dto.PurchaseOrderCompanyConfigurationRequest;
import com.kong.oc.dto.PurchaseOrderCompanyConfigurationResponse;
import com.kong.oc.model.PurchaseOrderCompanyConfiguration;
import com.kong.oc.repository.PurchaseOrderCompanyConfigurationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PurchaseOrderCompanyConfigurationService {

    private static final String REQUIRED_CONFIGURATION_MESSAGE =
            "Configura los datos de la empresa antes de registrar órdenes de compra.";

    private final PurchaseOrderCompanyConfigurationRepository repository;

    @Transactional(readOnly = true)
    public PurchaseOrderCompanyConfigurationResponse getConfiguration() {
        return repository
                .findById(PurchaseOrderCompanyConfiguration.SINGLETON_ID)
                .map(this::toResponse)
                .orElse(null);
    }

    @Transactional
    public PurchaseOrderCompanyConfigurationResponse updateConfiguration(
            PurchaseOrderCompanyConfigurationRequest request
    ) {
        PurchaseOrderCompanyConfiguration configuration = repository
                .findById(PurchaseOrderCompanyConfiguration.SINGLETON_ID)
                .orElseGet(this::buildNewConfiguration);

        configuration.setCompanyName(normalize(request.companyName()));
        configuration.setCompanyRuc(normalize(request.companyRuc()));
        configuration.setCompanyAddress(normalize(request.companyAddress()));

        return toResponse(repository.save(configuration));
    }

    @Transactional(readOnly = true)
    public PurchaseOrderCompanyConfigurationResponse resolveForPdf() {
        return toResponse(resolveConfigurationOrThrow());
    }

    @Transactional(readOnly = true)
    public void assertConfigurationExists() {
        resolveConfigurationOrThrow();
    }

    private PurchaseOrderCompanyConfiguration resolveConfigurationOrThrow() {
        return repository
                .findById(PurchaseOrderCompanyConfiguration.SINGLETON_ID)
                .orElseThrow(() -> new BadRequestException(REQUIRED_CONFIGURATION_MESSAGE));
    }

    private PurchaseOrderCompanyConfiguration buildNewConfiguration() {
        return PurchaseOrderCompanyConfiguration.builder()
                .id(PurchaseOrderCompanyConfiguration.SINGLETON_ID)
                .build();
    }

    private PurchaseOrderCompanyConfigurationResponse toResponse(
            PurchaseOrderCompanyConfiguration configuration
    ) {
        return new PurchaseOrderCompanyConfigurationResponse(
                configuration.getCompanyName(),
                configuration.getCompanyRuc(),
                configuration.getCompanyAddress()
        );
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ");
    }
}
