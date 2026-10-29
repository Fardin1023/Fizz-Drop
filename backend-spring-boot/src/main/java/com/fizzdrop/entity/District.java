package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

@Entity
@Table(name = "districts")
public class District {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "division", nullable = false, length = 100)
    private String division;

    public District() {}

    public District(String name, String division) {
        this.name = name;
        this.division = division;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDivision() { return division; }
    public void setDivision(String division) { this.division = division; }
}
