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

    public DatabaseController(JdbcTemplate jdbcTemplate, DataSource dataSource) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataSource = dataSource;
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getDatabaseStatus() {
        Map<String, Object> status = new HashMap<>();
        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData meta = conn.getMetaData();
            status.put("connected", true);
            status.put("engine", meta.getDatabaseProductName() + " " + meta.getDatabaseProductVersion());
            status.put("url", meta.getURL());
            status.put("user", meta.getUserName());
            status.put("driver", meta.getDriverName());
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
                        if ("PUBLIC".equalsIgnoreCase(schema) || schema == null || schema.isEmpty()) {
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
            String lower = sql.toLowerCase();
            if (lower.startsWith("select") || lower.startsWith("show") || lower.startsWith("describe") || lower.startsWith("desc")) {
                List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
                long duration = System.currentTimeMillis() - startTime;
                
                response.put("success", true);
                response.put("results", rows);
                response.put("rowCount", rows.size());
                response.put("executionTimeMs", duration);
                response.put("sql", sql);
                return ResponseEntity.ok(response);
            } else {
                int affectedRows = jdbcTemplate.update(sql);
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
