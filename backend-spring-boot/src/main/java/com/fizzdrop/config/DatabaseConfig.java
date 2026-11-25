package com.fizzdrop.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DriverManager;

@Configuration
public class DatabaseConfig {

    @Value("${spring.datasource.url:jdbc:oracle:thin:@localhost:1521/FREEPDB1}")
    private String defaultDbUrl;

    @Value("${spring.datasource.username:FIZZDROP}")
    private String defaultUsername;

    @Value("${spring.datasource.password:FizzDrop123#}")
    private String defaultPassword;

    public static String activeDbEngine = "Unknown";
    public static String activeDbUrl = "";
    public static String localOracleUrl = "jdbc:oracle:thin:@localhost:1521/FREEPDB1";
    public static String localOracleUser = "FIZZDROP";
    public static String localOraclePass = "FizzDrop123#";
    public static String localDbUrl = "jdbc:mysql://localhost:3306/fizzdrop_db?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&cachePrepStmts=true&prepStmtCacheSize=250&prepStmtCacheSqlLimit=2048&useServerPrepStmts=true&rewriteBatchedStatements=true";
    public static String localDbUser = "root";
    public static String localDbPass = "";
    public static String cloudDbUrl = "";
    public static String cloudDbUser = "";
    public static String cloudDbPass = "";

    @Bean
    @Primary
    public DataSource dataSource() {
        String effectiveUrl = defaultDbUrl;
        String effectiveUser = defaultUsername;
        String effectivePass = defaultPassword;

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
                        } else if (line.startsWith("LOCAL_DB_PASSWORD=")) {
                            foundLocalPass = line.substring("LOCAL_DB_PASSWORD=".length()).trim();
                        } else if (line.startsWith("LOCAL_DB_USER=")) {
                            foundLocalUser = line.substring("LOCAL_DB_USER=".length()).trim();
                        } else if (line.startsWith("AIVEN_DB_URL=")) {
                            foundCloudUrl = line.substring("AIVEN_DB_URL=".length()).trim();
                        } else if (line.startsWith("ORACLE_DB_URL=")) {
                            localOracleUrl = line.substring("ORACLE_DB_URL=".length()).trim();
                        } else if (line.startsWith("ORACLE_DB_USER=")) {
                            localOracleUser = line.substring("ORACLE_DB_USER=".length()).trim();
                        } else if (line.startsWith("ORACLE_DB_PASSWORD=")) {
                            localOraclePass = line.substring("ORACLE_DB_PASSWORD=".length()).trim();
                        }
                    }
                } catch (Exception ignored) {}
                break;
            }
        }

        localDbUser = foundLocalUser;
        localDbPass = foundLocalPass;

        // Auto-detect & convert Aiven service URI if provided in DB_URL
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
            } catch (Exception ex) {
                System.err.println("[DatabaseConfig] Error parsing Aiven mysql:// URI: " + ex.getMessage());
            }
        }

        boolean dbAvailable = false;
        boolean isOracle = (effectiveUrl != null && effectiveUrl.toLowerCase().contains("oracle"));

        System.out.println("[DatabaseConfig] Testing primary database connection at: " + effectiveUrl);

        // Try primary configured database
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                DriverManager.setLoginTimeout(10);
                if (isOracle) {
                    try { Class.forName("oracle.jdbc.OracleDriver"); } catch (Exception ignored) {}
                }
                try (Connection conn = DriverManager.getConnection(effectiveUrl, effectiveUser, effectivePass)) {
                    if (conn.isValid(5)) {
                        dbAvailable = true;
                        if (isOracle) {
                            activeDbEngine = "Oracle Database 23ai (" + effectiveUrl + ")";
                        } else {
                            activeDbEngine = effectiveUrl.contains("aivencloud.com") ? "Cloud MySQL (Aiven)" : "Local MySQL Server";
                        }
                        activeDbUrl = effectiveUrl;
                        System.out.println("[DatabaseConfig] Successfully connected to live database instance: " + activeDbEngine);
                        break;
                    }
                }
            } catch (Exception e) {
                System.out.println("[DatabaseConfig] Primary connection attempt " + attempt + " failed (" + e.getMessage() + ").");
                if (attempt < 2) {
                    try { Thread.sleep(1000); } catch (InterruptedException ignored) {}
                }
            }
        }

        // Fallback 1: Local Oracle (if primary was not Oracle but Oracle is requested or local Oracle available)
        if (!dbAvailable && !isOracle) {
            try {
                Class.forName("oracle.jdbc.OracleDriver");
                try (Connection conn = DriverManager.getConnection(localOracleUrl, localOracleUser, localOraclePass)) {
                    if (conn.isValid(3)) {
                        dbAvailable = true;
                        isOracle = true;
                        effectiveUrl = localOracleUrl;
                        effectiveUser = localOracleUser;
                        effectivePass = localOraclePass;
                        activeDbEngine = "Oracle Database 23ai (Localhost:1521/FREEPDB1)";
                        activeDbUrl = effectiveUrl;
                        System.out.println("[DatabaseConfig] Connected to Local Oracle Database 23ai fallback!");
                    }
                }
            } catch (Exception ignored) {}
        }

        // Fallback 2: Local MySQL (if primary was cloud MySQL and unreachable)
        if (!dbAvailable && !foundLocalPass.isEmpty()) {
            System.out.println("[DatabaseConfig] Attempting connection to Local MySQL at localhost:3306...");
            try (Connection conn = DriverManager.getConnection(localDbUrl, foundLocalUser, foundLocalPass)) {
                if (conn.isValid(5)) {
                    dbAvailable = true;
                    isOracle = false;
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

        // Fallback 3: H2 embedded
        if (!dbAvailable) {
            activeDbEngine = "H2 Relational Engine (Oracle/MySQL-Compatible)";
            System.out.println("[DatabaseConfig] Activating resilient local relational engine (H2 persistent store).");
        }

        HikariConfig config = new HikariConfig();
        if (dbAvailable) {
            config.setJdbcUrl(effectiveUrl);
            config.setUsername(effectiveUser);
            config.setPassword(effectivePass);
            if (isOracle) {
                config.setDriverClassName("oracle.jdbc.OracleDriver");
                config.setConnectionTestQuery("SELECT 1 FROM DUAL");
                config.setPoolName("FizzDropOracleHikariPool");
            } else {
                config.setDriverClassName("com.mysql.cj.jdbc.Driver");
                config.setPoolName("FizzDropHikariPool");
            }
            config.setMaximumPoolSize(25);
            config.setMinimumIdle(5);
            config.setConnectionTimeout(30000);
            config.setIdleTimeout(120000);
            config.setMaxLifetime(600000);
            config.setKeepaliveTime(30000);
            config.setValidationTimeout(5000);
        } else {
            java.io.File dataDir = new java.io.File("data");
            if (!dataDir.exists() && new java.io.File("backend-spring-boot/data").exists()) {
                dataDir = new java.io.File("backend-spring-boot/data");
            }
            dataDir.mkdirs();
            String h2Path = new java.io.File(dataDir, "fizzdrop_db").getAbsolutePath().replace("\\", "/");
            config.setJdbcUrl("jdbc:h2:file:" + h2Path + ";MODE=Oracle;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1");
            config.setUsername("sa");
            config.setPassword("");
            config.setDriverClassName("org.h2.Driver");
            config.setMaximumPoolSize(5);
            activeDbUrl = "jdbc:h2:file:" + h2Path;
        }

        return new HikariDataSource(config);
    }

    @Bean
    @Primary
    public JdbcTemplate jdbcTemplate(DataSource dataSource) {
        return new OracleCompatibleJdbcTemplate(dataSource);
    }
}
