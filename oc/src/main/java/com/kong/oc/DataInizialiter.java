package com.kong.oc;

import com.kong.oc.model.Banks;
import com.kong.oc.model.Services;
import com.kong.oc.model.Unit;
import com.kong.oc.repository.BanksRepository;
import com.kong.oc.repository.ServicesRepository;
import com.kong.oc.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInizialiter implements CommandLineRunner {

    private final BanksRepository banksRepository;
    private final ServicesRepository servicesRepository;
    private final UnitRepository unitRepository;

    @Override
    public void run(String... args){
        initializeDefaultBanks();
        initializeDefaultServices();
        initializeDefaultUnits();
    }

    private void initializeDefaultBanks(){
        long count = banksRepository.count();

        if(count > 0){
            log.info("Bancos ya inicializados, cantidad: {}", count);
            return;
        }

        log.info("Inicializando bancos por defecto...");

        List<Banks> defaultBanks = List.of(
                Banks.builder()
                        .banco("Bbva")
                        .build(),
                Banks.builder()
                        .banco("Scotiabank")
                        .build(),
                Banks.builder()
                        .banco("Interbank")
                        .build(),
                Banks.builder()
                        .banco("Bcp")
                        .build()
        );

        banksRepository.saveAll(defaultBanks);

        log.info("Bancos por defecto inicializados: {}", defaultBanks.size());
    }

    private void initializeDefaultServices(){
        long count = servicesRepository.count();

        if(count > 0){
            log.info("Servicios ya inicializados, cantidad: {}", count);
            return;
        }

        log.info("Inicializando servicios por defecto...");

        List<String> serviceNames = List.of(
                "Abarrotes",
                "Frutas y Verduras",
                "Pulpa de Fruta",
                "Carnes",
                "Pollo",
                "Embutidos y Carnes Frías",
                "Productos Lácteos",
                "Repostería e Insumos",
                "Chocolatería y Cacao",
                "Frutos Secos",
                "Tamales / Humitas",
                "Alimentos Preparados",
                "Distribuidor de Alimentos",
                "Gaseosas",
                "Cervezas",
                "Cervezas Artesanales",
                "Licores Nacionales",
                "Licores Importados",
                "Vinos",
                "Distribuidor de Bebidas",
                "Productos de Limpieza",
                "Higiene Personal",
                "Insumos de Limpieza Industrial",
                "EPP / Seguridad",
                "Equipos de Cocina",
                "Utensilios de Cocina",
                "Insumos para Restaurante",
                "Amenities Hoteleros",
                "Envases",
                "Vasos",
                "Servilletas",
                "Sorbetones",
                "Descartables",
                "Bolsas",
                "Útiles de Oficina",
                "Papelería",
                "Impresiones",
                "Computo",
                "Servicio Distributivo",
                "Importador / Distribuidor",
                "Gas"
        );

        List<Services> defaultServices = serviceNames.stream()
                .map(name -> Services.builder().nombre(name).build())
                .toList();

        servicesRepository.saveAll(defaultServices);

        log.info("Servicios por defecto inicializados: {}", defaultServices.size());
    }

    private void initializeDefaultUnits(){
        long count = unitRepository.count();

        if(count > 0){
            log.info("Unidades de medida ya inicializadas, cantidad: {}", count);
            return;
        }

        log.info("Inicializando unidades de medida por defecto...");

        List<Unit> defaultUnits = List.of(
                Unit.builder()
                        .codigo("KG")
                        .nombre("Kilogramos")
                        .build(),
                Unit.builder()
                        .codigo("UND")
                        .nombre("Unidad")
                        .build(),
                Unit.builder()
                        .codigo("PAQ")
                        .nombre("Paquete")
                        .build(),
                Unit.builder()
                        .codigo("DOC")
                        .nombre("Docena")
                        .build(),
                Unit.builder()
                        .codigo("GR")
                        .nombre("Gramos")
                        .build()
        );

        unitRepository.saveAll(defaultUnits);

        log.info("Unidades de medida por defecto inicializadas: {}", defaultUnits.size());
    }

}
