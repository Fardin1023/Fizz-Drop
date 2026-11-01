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
        String effectiveUrl = mysqlUrl;
        String effectiveUser = username;
        String effectivePass = password;

        // Auto-detect & convert Aiven service URI (e.g. mysql://user:pass@host:port/dbname?ssl-mode=REQUIRED)
        if (effectiveUrl != null && effectiveUrl.startsWith("mysql://")) {
            try {
                java.net.URI uri = java.net.URI.create(effectiveUrl);
                String userInfo = uri.getUserInfo();
                if (userInfo != null && userInfo.contains(":")) {
                    String[] userParts = userInfo.split(":", 2);
                    if (effectiveUser == null || effectiveUser.equals("root") || effectiveUser.isEmpty()) {
                        effectiveUser = java.net.URLDecoder.decode(userParts[0], java.nio.charset.StandardCharsets.UTF_8);
                    }
                    if (effectivePass == null || effectivePass.isEmpty()) {
                        effectivePass = java.net.URLDecoder.decode(userParts[1], java.nio.charset.StandardCharsets.UTF_8);
                    }
                }
                String dbPath = uri.getPath() != null && uri.getPath().length() > 1 ? uri.getPath().substring(1) : "defaultdb";
                int port = uri.getPort() != -1 ? uri.getPort() : 3306;
                effectiveUrl = "jdbc:mysql://" + uri.getHost() + ":" + port + "/" + dbPath 
                        + "?sslMode=REQUIRED&useSSL=true&allowPublicKeyRetrieval=true&serverTimezone=UTC";
                System.out.println("[DatabaseConfig] Converted Aiven URI to Cloud JDBC URL: " + uri.getHost() + ":" + port + "/" + dbPath);
            } catch (Exception ex) {
                System.err.println("[DatabaseConfig] Error parsing Aiven mysql:// URI: " + ex.getMessage());
            }
        }

        System.out.println("[DatabaseConfig] Testing connection to MySQL at: " + effectiveUrl);
        boolean mysqlAvailable = false;

        try {
            // Cloud timeout for TLS/SSL handshake (up to 8 seconds)
            DriverManager.setLoginTimeout(8);
            try (Connection conn = DriverManager.getConnection(effectiveUrl, effectiveUser, effectivePass)) {
                if (conn.isValid(5)) {
                    mysqlAvailable = true;
                    System.out.println("[DatabaseConfig] Successfully connected to live MySQL instance (" + effectiveUrl + ")!");
                }
            }
        } catch (Exception e) {
            System.out.println("[DatabaseConfig] MySQL connection failed (" + e.getMessage() + ").");
            System.out.println("[DatabaseConfig] Activating resilient local relational engine (H2 MySQL-Compatible persistent store).");
        }

        HikariConfig config = new HikariConfig();
        if (mysqlAvailable) {
            config.setJdbcUrl(effectiveUrl);
            config.setUsername(effectiveUser);
            config.setPassword(effectivePass);
            config.setDriverClassName("com.mysql.cj.jdbc.Driver");
            config.setMaximumPoolSize(10);
            config.setConnectionTimeout(15000);
            config.setIdleTimeout(600000);
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
