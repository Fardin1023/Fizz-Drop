package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "regional_sales_managers")
public class RegionalSalesManager {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "email", nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "phone", nullable = false, length = 50)
    private String phone;

    @Column(name = "division", nullable = false, unique = true, length = 100)
    private String division;

    @Column(name = "target_sales", precision = 15, scale = 2)
    @JsonProperty("target_sales")
    private BigDecimal targetSales = new BigDecimal("15000000.00");

    @Column(name = "created_at")
    @JsonProperty("created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public RegionalSalesManager() {}

    public RegionalSalesManager(String code, String name, String email, String phone, String division, BigDecimal targetSales) {
        this.code = code;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.division = division;
        this.targetSales = targetSales != null ? targetSales : new BigDecimal("15000000.00");
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getDivision() { return division; }
    public void setDivision(String division) { this.division = division; }

    public BigDecimal getTargetSales() { return targetSales; }
    public void setTargetSales(BigDecimal targetSales) { this.targetSales = targetSales; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
