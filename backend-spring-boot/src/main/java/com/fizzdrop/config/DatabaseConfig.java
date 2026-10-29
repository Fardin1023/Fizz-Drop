package com.fizzdrop.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DriverManager;

@Configuration
public class DatabaseConfig {

    @Value("${spring.datasource.url:jdbc:mysql://localhost:3306/fizzdrop_db?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC}")
    private String mysqlUrl;

    @Value("${spring.datasource.username:root}")
    private String username;

    @Value("${spring.datasource.password:}")
    private String password;

    @Bean
    @Primary
    public DataSource dataSource() {
        System.out.println("[DatabaseConfig] Testing connection to MySQL at: " + mysqlUrl);
        boolean mysqlAvailable = false;

        try {
            // Attempt short-timeout probe connection to MySQL
            DriverManager.setLoginTimeout(2);
            try (Connection conn = DriverManager.getConnection(mysqlUrl, username, password)) {
                if (conn.isValid(2)) {
                    mysqlAvailable = true;
                    System.out.println("[DatabaseConfig] Successfully connected to live MySQL instance!");
                }
            }
        } catch (Exception e) {
            System.out.println("[DatabaseConfig] MySQL connection failed (" + e.getMessage() + ").");
            System.out.println("[DatabaseConfig] Activating resilient local relational engine (H2 MySQL-Compatible persistent store).");
        }

        HikariConfig config = new HikariConfig();
        if (mysqlAvailable) {
            config.setJdbcUrl(mysqlUrl);
            config.setUsername(username);
            config.setPassword(password);
            config.setDriverClassName("com.mysql.cj.jdbc.Driver");
            config.setMaximumPoolSize(10);
        } else {
            // Persistent file-backed relational database in MySQL mode
            config.setJdbcUrl("jdbc:h2:file:./data/fizzdrop_db;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1");
            config.setUsername("sa");
            config.setPassword("");
            config.setDriverClassName("org.h2.Driver");
            config.setMaximumPoolSize(5);
        }

        return new HikariDataSource(config);
    }
}
