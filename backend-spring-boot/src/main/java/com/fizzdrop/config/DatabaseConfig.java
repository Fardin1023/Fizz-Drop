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

        // Fallback: check for .env file if DB_URL was not passed or defaulted to localhost
        if (effectiveUrl == null || effectiveUrl.contains("localhost:3306")) {
            java.io.File[] candidates = new java.io.File[]{
                new java.io.File(".env"),
                new java.io.File("../.env"),
                new java.io.File(System.getProperty("user.dir"), ".env")
            };
            for (java.io.File envFile : candidates) {
                if (envFile.exists()) {
                    try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.FileReader(envFile))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            line = line.trim();
                            if (line.startsWith("DB_URL=")) {
                                effectiveUrl = line.substring("DB_URL=".length()).trim();
                                System.out.println("[DatabaseConfig] Read DB_URL from " + envFile.getAbsolutePath());
                                break;
                            }
                        }
                    } catch (Exception ignored) {}
                    if (effectiveUrl != null && !effectiveUrl.contains("localhost:3306")) {
                        break;
                    }
                }
            }
        }

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
                        + "?sslMode=REQUIRED&useSSL=true&allowPublicKeyRetrieval=true&serverTimezone=UTC&connectTimeout=15000&socketTimeout=30000&cachePrepStmts=true&prepStmtCacheSize=250&prepStmtCacheSqlLimit=2048&useServerPrepStmts=true&rewriteBatchedStatements=true";
                System.out.println("[DatabaseConfig] Converted Aiven URI to Cloud JDBC URL: " + uri.getHost() + ":" + port + "/" + dbPath);
            } catch (Exception ex) {
                System.err.println("[DatabaseConfig] Error parsing Aiven mysql:// URI: " + ex.getMessage());
            }
        }

        System.out.println("[DatabaseConfig] Testing connection to MySQL at: " + effectiveUrl);
        boolean mysqlAvailable = false;

        // Try up to 2 attempts for cloud TLS handshake
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                DriverManager.setLoginTimeout(15);
                try (Connection conn = DriverManager.getConnection(effectiveUrl, effectiveUser, effectivePass)) {
                    if (conn.isValid(5)) {
                        mysqlAvailable = true;
                        System.out.println("[DatabaseConfig] Successfully connected to live MySQL instance (" + effectiveUrl + ")!");
                        break;
                    }
                }
            } catch (Exception e) {
                System.out.println("[DatabaseConfig] MySQL connection attempt " + attempt + " failed (" + e.getMessage() + ").");
                if (attempt < 2) {
                    try { Thread.sleep(1000); } catch (InterruptedException ignored) {}
                }
            }
        }

        if (!mysqlAvailable) {
            System.out.println("[DatabaseConfig] Activating resilient local relational engine (H2 MySQL-Compatible persistent store).");
        }

        HikariConfig config = new HikariConfig();
        if (mysqlAvailable) {
            config.setJdbcUrl(effectiveUrl);
            config.setUsername(effectiveUser);
            config.setPassword(effectivePass);
            config.setDriverClassName("com.mysql.cj.jdbc.Driver");
            config.setMaximumPoolSize(25);
            config.setMinimumIdle(5);
            config.setConnectionTimeout(30000);
            config.setIdleTimeout(120000);
            config.setMaxLifetime(600000);
            config.setKeepaliveTime(30000);
            config.setValidationTimeout(5000);
            config.setPoolName("FizzDropHikariPool");
        } else {
            // Persistent file-backed relational database in MySQL mode (consistent directory location)
            java.io.File dataDir = new java.io.File("data");
            if (!dataDir.exists() && new java.io.File("backend-spring-boot/data").exists()) {
                dataDir = new java.io.File("backend-spring-boot/data");
            }
            dataDir.mkdirs();
            String h2Path = new java.io.File(dataDir, "fizzdrop_db").getAbsolutePath().replace("\\", "/");
            config.setJdbcUrl("jdbc:h2:file:" + h2Path + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1");
            config.setUsername("sa");
            config.setPassword("");
            config.setDriverClassName("org.h2.Driver");
            config.setMaximumPoolSize(5);
        }

        return new HikariDataSource(config);
    }
}
