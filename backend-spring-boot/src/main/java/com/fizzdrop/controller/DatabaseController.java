package com.fizzdrop.controller;

import com.fizzdrop.dto.ApiResponse;
import com.fizzdrop.dto.QueryRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.util.*;

@RestController
@RequestMapping("/api/db")
public class DatabaseController {

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;

    private static Map<String, Object> cachedStatus = null;
    private static long lastStatusCheck = 0;
    private static final long STATUS_CACHE_MS = 60000; // 60 seconds cache

    public DatabaseController(JdbcTemplate jdbcTemplate, DataSource dataSource) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataSource = dataSource;
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getDatabaseStatus() {
        long now = System.currentTimeMillis();
        if (cachedStatus != null && (now - lastStatusCheck < STATUS_CACHE_MS)) {
            return ResponseEntity.ok(cachedStatus);
        }

        Map<String, Object> status = new HashMap<>();
        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData meta = conn.getMetaData();
            String prodName = meta.getDatabaseProductName();
            boolean isOracle = prodName != null && prodName.toLowerCase().contains("oracle");

            status.put("connected", true);
            status.put("active_engine", prodName + " " + meta.getDatabaseProductVersion());
            status.put("engine", isOracle ? "Oracle Database 23ai" : prodName);
            status.put("active_url", meta.getURL());
            status.put("active_user", meta.getUserName());
            status.put("active_driver", meta.getDriverName());
            status.put("host", "localhost");
            status.put("port", isOracle ? "1521" : "3306");
            status.put("user", meta.getUserName());
            status.put("database", isOracle ? "FREEPDB1" : "fizzdrop_db");

            // Test Local Oracle 23ai
            Map<String, Object> oracleStatus = new HashMap<>();
            try {
                Class.forName("oracle.jdbc.OracleDriver");
                try (Connection oConn = java.sql.DriverManager.getConnection(com.fizzdrop.config.DatabaseConfig.localOracleUrl, com.fizzdrop.config.DatabaseConfig.localOracleUser, com.fizzdrop.config.DatabaseConfig.localOraclePass)) {
                    oracleStatus.put("available", oConn.isValid(3));
                    oracleStatus.put("url", "localhost:1521/FREEPDB1");
                    oracleStatus.put("user", com.fizzdrop.config.DatabaseConfig.localOracleUser);
                }
            } catch (Exception ex) {
                oracleStatus.put("available", false);
                oracleStatus.put("error", ex.getMessage());
            }
            status.put("local_oracle", oracleStatus);

            // Test Local MySQL
            Map<String, Object> localStatus = new HashMap<>();
            try (Connection lConn = java.sql.DriverManager.getConnection(com.fizzdrop.config.DatabaseConfig.localDbUrl, com.fizzdrop.config.DatabaseConfig.localDbUser, com.fizzdrop.config.DatabaseConfig.localDbPass)) {
                localStatus.put("available", lConn.isValid(3));
                localStatus.put("url", "localhost:3306/fizzdrop_db");
                localStatus.put("user", com.fizzdrop.config.DatabaseConfig.localDbUser);
            } catch (Exception ex) {
                localStatus.put("available", false);
                localStatus.put("error", ex.getMessage());
            }
            status.put("local_mysql", localStatus);

            // Test Cloud MySQL (Aiven)
            Map<String, Object> cloudStatus = new HashMap<>();
            if (com.fizzdrop.config.DatabaseConfig.cloudDbUrl != null && !com.fizzdrop.config.DatabaseConfig.cloudDbUrl.isEmpty()) {
                try (Connection cConn = java.sql.DriverManager.getConnection(com.fizzdrop.config.DatabaseConfig.cloudDbUrl, com.fizzdrop.config.DatabaseConfig.cloudDbUser, com.fizzdrop.config.DatabaseConfig.cloudDbPass)) {
                    cloudStatus.put("available", cConn.isValid(5));
                    cloudStatus.put("url", "mysql-39d89ca3-fizzdrop.j.aivencloud.com:11066");
                    cloudStatus.put("user", com.fizzdrop.config.DatabaseConfig.cloudDbUser);
                } catch (Exception ex) {
                    cloudStatus.put("available", false);
                    cloudStatus.put("error", ex.getMessage());
                }
            } else {
                cloudStatus.put("available", false);
                cloudStatus.put("message", "Cloud URI not configured");
            }
            status.put("cloud_mysql", cloudStatus);

            cachedStatus = status;
            lastStatusCheck = now;

            return ResponseEntity.ok(status);
        } catch (Exception e) {
            status.put("connected", false);
            status.put("error", e.getMessage());
            status.put("engine", "Spring Boot JDBC (Offline/Connecting)");
            return ResponseEntity.ok(status);
        }
    }

    @GetMapping("/tables")
    public ResponseEntity<List<String>> getTables() {
        Set<String> tables = new LinkedHashSet<>();
        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData meta = conn.getMetaData();
            try (ResultSet rs = meta.getTables(conn.getCatalog(), null, "%", new String[]{"TABLE"})) {
                while (rs.next()) {
                    String schema = rs.getString("TABLE_SCHEM");
                    String tableName = rs.getString("TABLE_NAME");
                    // Exclude internal H2 metadata tables
                    if (tableName != null && !tableName.equalsIgnoreCase("branches")) {
                        String currentUsername = meta.getUserName();
                        if ("PUBLIC".equalsIgnoreCase(schema) || schema == null || schema.isEmpty() || (currentUsername != null && currentUsername.equalsIgnoreCase(schema))) {
                            tables.add(tableName.toLowerCase());
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Fallback list of active tables
            return ResponseEntity.ok(List.of(
                "districts", "supplier_profiles", "stock_requisitions", "stock_requisition_items",
                "district_inventory", "outlets", "products", "shop_inventory", "users", "roles"
            ));
        }
        return ResponseEntity.ok(new ArrayList<>(tables));
    }

    @PostMapping("/query")
    public ResponseEntity<Map<String, Object>> executeQuery(@RequestBody QueryRequest req) {
        String sql = (req.getSql() != null) ? req.getSql().trim() : "";
        Map<String, Object> response = new HashMap<>();
        long startTime = System.currentTimeMillis();

        if (sql.isEmpty()) {
            response.put("success", false);
            response.put("error", "SQL statement cannot be empty");
            return ResponseEntity.badRequest().body(response);
        }

        try {
            String cleanSql = sql.trim();
            while (cleanSql.endsWith(";")) {
                cleanSql = cleanSql.substring(0, cleanSql.length() - 1).trim();
            }
            String lower = cleanSql.toLowerCase();

            // Handle DESCRIBE / DESC via DatabaseMetaData or Oracle Data Dictionary
            if (lower.startsWith("describe ") || lower.startsWith("desc ")) {
                String tableName = cleanSql.replaceAll("(?i)^(describe|desc)\\s+", "").replace("`", "").trim();
                List<Map<String, Object>> colRows = new ArrayList<>();
                try (Connection conn = dataSource.getConnection()) {
                    DatabaseMetaData meta = conn.getMetaData();
                    String prod = meta.getDatabaseProductName();
                    boolean isOracle = prod != null && prod.toLowerCase().contains("oracle");

                    if (isOracle) {
                        String sqlCols = "SELECT column_name, data_type, data_length, data_precision, data_scale, nullable, identity_column " +
                                         "FROM user_tab_cols WHERE table_name = UPPER(?) ORDER BY column_id";
                        try (java.sql.PreparedStatement ps = conn.prepareStatement(sqlCols)) {
                            ps.setString(1, tableName);
                            try (ResultSet rs = ps.executeQuery()) {
                                while (rs.next()) {
                                    String cName = rs.getString("COLUMN_NAME");
                                    String dType = rs.getString("DATA_TYPE");
                                    int dLen = rs.getInt("DATA_LENGTH");
                                    int dPrec = rs.getInt("DATA_PRECISION");
                                    int dScale = rs.getInt("DATA_SCALE");
                                    String isNull = rs.getString("NULLABLE");
                                    String isIdent = rs.getString("IDENTITY_COLUMN");

                                    String formattedType = dType;
                                    if ("VARCHAR2".equalsIgnoreCase(dType) || "CHAR".equalsIgnoreCase(dType)) {
                                        formattedType += "(" + dLen + ")";
                                    } else if ("NUMBER".equalsIgnoreCase(dType) && dPrec > 0) {
                                        formattedType += "(" + dPrec + (dScale > 0 ? "," + dScale : "") + ")";
                                    }

                                    Map<String, Object> colMap = new LinkedHashMap<>();
                                    colMap.put("Field", cName.toLowerCase());
                                    colMap.put("Type", formattedType);
                                    colMap.put("Null", "Y".equalsIgnoreCase(isNull) ? "YES" : "NO");
                                    colMap.put("Key", "YES".equalsIgnoreCase(isIdent) || "id".equalsIgnoreCase(cName) ? "PRI" : "");
                                    colMap.put("Default", "");
                                    colMap.put("Extra", "YES".equalsIgnoreCase(isIdent) ? "auto_increment" : "");
                                    colRows.add(colMap);
                                }
                            }
                        }
                    } else {
                        try (java.sql.Statement st = conn.createStatement();
                             ResultSet rs = st.executeQuery("DESCRIBE `" + tableName + "`")) {
                            while (rs.next()) {
                                Map<String, Object> colMap = new LinkedHashMap<>();
                                colMap.put("Field", rs.getString(1));
                                colMap.put("Type", rs.getString(2));
                                colMap.put("Null", rs.getString(3));
                                colMap.put("Key", rs.getString(4));
                                colMap.put("Default", rs.getString(5));
                                colMap.put("Extra", rs.getString(6));
                                colRows.add(colMap);
                            }
                        }
                    }
                }

                long duration = System.currentTimeMillis() - startTime;
                response.put("success", true);
                response.put("results", colRows);
                response.put("rowCount", colRows.size());
                response.put("executionTimeMs", duration);
                response.put("sql", sql);
                return ResponseEntity.ok(response);
            }

            // Handle SHOW TABLES for universal database support
            if (lower.equals("show tables") || lower.startsWith("show tables")) {
                List<Map<String, Object>> tableRows = new ArrayList<>();
                try (Connection conn = dataSource.getConnection()) {
                    DatabaseMetaData meta = conn.getMetaData();
                    try (ResultSet rs = meta.getTables(null, meta.getUserName(), "%", new String[]{"TABLE"})) {
                        while (rs.next()) {
                            Map<String, Object> tr = new HashMap<>();
                            tr.put("Tables_in_database", rs.getString("TABLE_NAME"));
                            tableRows.add(tr);
                        }
                    }
                }
                long duration = System.currentTimeMillis() - startTime;
                response.put("success", true);
                response.put("results", tableRows);
                response.put("rowCount", tableRows.size());
                response.put("executionTimeMs", duration);
                response.put("sql", sql);
                return ResponseEntity.ok(response);
            }

            if (lower.startsWith("select") || lower.startsWith("show")) {
                List<Map<String, Object>> rows = jdbcTemplate.queryForList(cleanSql);
                long duration = System.currentTimeMillis() - startTime;
                
                response.put("success", true);
                response.put("results", rows);
                response.put("rowCount", rows.size());
                response.put("executionTimeMs", duration);
                response.put("sql", sql);
                return ResponseEntity.ok(response);
            } else {
                int affectedRows = jdbcTemplate.update(cleanSql);
                long duration = System.currentTimeMillis() - startTime;

                response.put("success", true);
                response.put("results", List.of(Map.of("affectedRows", affectedRows)));
                response.put("rowCount", affectedRows);
                response.put("executionTimeMs", duration);
                response.put("sql", sql);
                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("executionTimeMs", duration);
            response.put("sql", sql);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }
}
