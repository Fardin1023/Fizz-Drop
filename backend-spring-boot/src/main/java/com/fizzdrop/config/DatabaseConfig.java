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

    public static String activeDbEngine = "Unknown";
    public static String activeDbUrl = "";
    public static String localDbUrl = "jdbc:mysql://localhost:3306/fizzdrop_db?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC";
    public static String localDbUser = "root";
    public static String localDbPass = "";
    public static String cloudDbUrl = "";
    public static String cloudDbUser = "";
    public static String cloudDbPass = "";

    @Bean
    @Primary
    public DataSource dataSource() {
        String effectiveUrl = mysqlUrl;
        String effectiveUser = username;
        String effectivePass = password;

        String foundLocalPass = "";
        String foundLocalUser = "root";
        String foundCloudUrl = "";

        // Check for .env file across standard lookup paths
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
                        if (line.startsWith("#")) continue;
                        if (line.startsWith("DB_URL=")) {
                            effectiveUrl = line.substring("DB_URL=".length()).trim();
                        } else if (line.startsWith("DB_USER=")) {
                            effectiveUser = line.substring("DB_USER=".length()).trim();
                        } else if (line.startsWith("DB_PASSWORD=")) {
                            effectivePass = line.substring("DB_PASSWORD=".length()).trim();
                            foundLocalPass = effectivePass;
                        } else if (line.startsWith("LOCAL_DB_PASSWORD=")) {
                            foundLocalPass = line.substring("LOCAL_DB_PASSWORD=".length()).trim();
                        } else if (line.startsWith("LOCAL_DB_USER=")) {
                            foundLocalUser = line.substring("LOCAL_DB_USER=".length()).trim();
                        } else if (line.startsWith("AIVEN_DB_URL=")) {
                            foundCloudUrl = line.substring("AIVEN_DB_URL=".length()).trim();
                        }
                    }
                } catch (Exception ignored) {}
                break;
            }
        }

        localDbUser = foundLocalUser;
        localDbPass = foundLocalPass;

        // Auto-detect & convert Aiven service URI (e.g. mysql://user:pass@host:port/dbname?ssl-mode=REQUIRED)
        if (effectiveUrl != null && effectiveUrl.startsWith("mysql://")) {
            try {
                java.net.URI uri = java.net.URI.create(effectiveUrl);
                String userInfo = uri.getUserInfo();
                if (userInfo != null && userInfo.contains(":")) {
                    String[] userParts = userInfo.split(":", 2);
                    effectiveUser = java.net.URLDecoder.decode(userParts[0], java.nio.charset.StandardCharsets.UTF_8);
                    effectivePass = java.net.URLDecoder.decode(userParts[1], java.nio.charset.StandardCharsets.UTF_8);
                }
                String dbPath = uri.getPath() != null && uri.getPath().length() > 1 ? uri.getPath().substring(1) : "defaultdb";
                int port = uri.getPort() != -1 ? uri.getPort() : 3306;
                effectiveUrl = "jdbc:mysql://" + uri.getHost() + ":" + port + "/" + dbPath 
                        + "?sslMode=REQUIRED&useSSL=true&allowPublicKeyRetrieval=true&serverTimezone=UTC&connectTimeout=15000&socketTimeout=30000&cachePrepStmts=true&prepStmtCacheSize=250&prepStmtCacheSqlLimit=2048&useServerPrepStmts=true&rewriteBatchedStatements=true";
                cloudDbUrl = effectiveUrl;
                cloudDbUser = effectiveUser;
                cloudDbPass = effectivePass;
                System.out.println("[DatabaseConfig] Converted Aiven URI to Cloud JDBC URL: " + uri.getHost() + ":" + port + "/" + dbPath);
            } catch (Exception ex) {
                System.err.println("[DatabaseConfig] Error parsing Aiven mysql:// URI: " + ex.getMessage());
            }
        }

        System.out.println("[DatabaseConfig] Testing connection to MySQL at: " + effectiveUrl);
        boolean mysqlAvailable = false;

        // Try primary connection
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                DriverManager.setLoginTimeout(15);
                try (Connection conn = DriverManager.getConnection(effectiveUrl, effectiveUser, effectivePass)) {
                    if (conn.isValid(5)) {
                        mysqlAvailable = true;
                        activeDbEngine = effectiveUrl.contains("aivencloud.com") ? "Cloud MySQL (Aiven)" : "Local MySQL Server";
                        activeDbUrl = effectiveUrl;
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

        // Seamless fallback to Local MySQL if Cloud was unreachable
        if (!mysqlAvailable && effectiveUrl != null && !effectiveUrl.contains("localhost:3306") && !foundLocalPass.isEmpty()) {
            System.out.println("[DatabaseConfig] Primary MySQL unreachable. Attempting connection to Local MySQL at localhost:3306...");
            try (Connection conn = DriverManager.getConnection(localDbUrl, foundLocalUser, foundLocalPass)) {
                if (conn.isValid(5)) {
                    mysqlAvailable = true;
                    effectiveUrl = localDbUrl;
                    effectiveUser = foundLocalUser;
                    effectivePass = foundLocalPass;
                    activeDbEngine = "Local MySQL Server (localhost:3306)";
                    activeDbUrl = effectiveUrl;
                    System.out.println("[DatabaseConfig] Successfully connected to Local MySQL instance!");
                }
            } catch (Exception e) {
                System.out.println("[DatabaseConfig] Local MySQL connection failed: " + e.getMessage());
            }
        }

        if (!mysqlAvailable) {
            activeDbEngine = "H2 Relational Engine (MySQL-Compatible)";
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
            activeDbUrl = "jdbc:h2:file:" + h2Path;
        }

        return new HikariDataSource(config);
    }
}
