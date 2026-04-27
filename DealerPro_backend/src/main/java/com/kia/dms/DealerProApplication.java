package com.kia.dms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@org.springframework.cache.annotation.EnableCaching
public class DealerProApplication {

	public static void main(String[] args) {
		SpringApplication.run(DealerProApplication.class, args);
	}

}
