package com.kong.oc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class OcApplication {

	public static void main(String[] args) {
		SpringApplication.run(OcApplication.class, args);
	}

}
