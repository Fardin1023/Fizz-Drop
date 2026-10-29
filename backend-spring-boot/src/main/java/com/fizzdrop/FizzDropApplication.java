package com.fizzdrop;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class FizzDropApplication {
    public static void main(String[] args) {
        SpringApplication.run(FizzDropApplication.class, args);
        System.out.println("=================================================");
        System.out.println("🥤 FizzDrop Spring Boot Backend running on http://localhost:8080");
        System.out.println("API Endpoints available: /api/products, /api/outlets, /api/auth, /api/db");
        System.out.println("=================================================");
    }
}
