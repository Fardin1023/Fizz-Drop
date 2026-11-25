package com.fizzdrop.config;

import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.*;
import org.springframework.lang.Nullable;

import javax.sql.DataSource;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * Enterprise Transparent Query Adapter for Oracle Database Compatibility.
 * Seamlessly normalizes ANSI/MySQL query conventions (e.g. LIMIT, backticks,
 * DDL variations) into native high-performance Oracle 23ai constructs at runtime.
 */
public class OracleCompatibleJdbcTemplate extends JdbcTemplate {

    public OracleCompatibleJdbcTemplate(DataSource dataSource) {
        super(dataSource);
    }

    public static String adaptSql(String sql) {
        if (sql == null) return null;
        sql = sql.trim();
        // Strip trailing semicolons which cause ORA-00911 in Oracle JDBC
        while (sql.endsWith(";")) {
            sql = sql.substring(0, sql.length() - 1).trim();
        }

        if (DatabaseConfig.activeDbEngine != null && DatabaseConfig.activeDbEngine.toLowerCase().contains("oracle")) {
            // Strip MySQL backticks
            if (sql.contains("`")) {
                sql = sql.replace("`", "");
            }
            // Replace LIMIT m OFFSET n with standard ANSI/Oracle OFFSET n ROWS FETCH NEXT m ROWS ONLY
            if (sql.matches("(?si).*\\bLIMIT\\s+\\d+\\s+OFFSET\\s+\\d+.*")) {
                sql = sql.replaceAll("(?i)\\bLIMIT\\s+(\\d+)\\s+OFFSET\\s+(\\d+)", "OFFSET $2 ROWS FETCH NEXT $1 ROWS ONLY");
            }
            // Replace LIMIT n, m with OFFSET n ROWS FETCH NEXT m ROWS ONLY
            else if (sql.matches("(?si).*\\bLIMIT\\s+\\d+\\s*,\\s*\\d+.*")) {
                sql = sql.replaceAll("(?i)\\bLIMIT\\s+(\\d+)\\s*,\\s*(\\d+)", "OFFSET $1 ROWS FETCH NEXT $2 ROWS ONLY");
            }
            // Replace standalone LIMIT <n> with FETCH FIRST <n> ROWS ONLY
            else if (sql.matches("(?si).*\\bLIMIT\\s+\\d+.*")) {
                sql = sql.replaceAll("(?i)\\bLIMIT\\s+(\\d+)", "FETCH FIRST $1 ROWS ONLY");
            }

            // Replace ALTER TABLE ... ADD COLUMN ... with ALTER TABLE ... ADD ...
            if (sql.matches("(?si).*\\bALTER\\s+TABLE\\s+\\w+\\s+ADD\\s+COLUMN\\s+.*")) {
                sql = sql.replaceAll("(?i)\\bALTER\\s+TABLE\\s+(\\w+)\\s+ADD\\s+COLUMN\\s+", "ALTER TABLE $1 ADD ");
            }
            // Replace ALTER TABLE ... MODIFY COLUMN ... with ALTER TABLE ... MODIFY ...
            if (sql.matches("(?si).*\\bALTER\\s+TABLE\\s+\\w+\\s+MODIFY\\s+COLUMN\\s+.*")) {
                sql = sql.replaceAll("(?i)\\bALTER\\s+TABLE\\s+(\\w+)\\s+MODIFY\\s+COLUMN\\s+", "ALTER TABLE $1 MODIFY ");
            }
            // Replace DATE(x) = CURDATE() with TRUNC(x) = TRUNC(SYSDATE)
            if (sql.contains("CURDATE()")) {
                sql = sql.replaceAll("(?i)DATE\\((\\w+)\\)\\s*=\\s*CURDATE\\(\\)", "TRUNC($1) = TRUNC(SYSDATE)");
            }
        }
        return sql;
    }

    @Override
    public void execute(String sql) throws DataAccessException {
        super.execute(adaptSql(sql));
    }

    @Override
    public <T> T execute(String sql, PreparedStatementCallback<T> action) throws DataAccessException {
        return super.execute(adaptSql(sql), action);
    }

    @Override
    public <T> T query(String sql, ResultSetExtractor<T> rse) throws DataAccessException {
        return super.query(adaptSql(sql), rse);
    }

    @Override
    public void query(String sql, RowCallbackHandler rch) throws DataAccessException {
        super.query(adaptSql(sql), rch);
    }

    @Override
    public <T> List<T> query(String sql, RowMapper<T> rowMapper) throws DataAccessException {
        return super.query(adaptSql(sql), rowMapper);
    }

    @Override
    public <T> T query(String sql, @Nullable PreparedStatementSetter pss, ResultSetExtractor<T> rse) throws DataAccessException {
        return super.query(adaptSql(sql), pss, rse);
    }

    @Override
    public void query(String sql, @Nullable PreparedStatementSetter pss, RowCallbackHandler rch) throws DataAccessException {
        super.query(adaptSql(sql), pss, rch);
    }

    @Override
    public <T> List<T> query(String sql, @Nullable PreparedStatementSetter pss, RowMapper<T> rowMapper) throws DataAccessException {
        return super.query(adaptSql(sql), pss, rowMapper);
    }

    @Override
    public <T> T query(String sql, Object[] args, int[] argTypes, ResultSetExtractor<T> rse) throws DataAccessException {
        return super.query(adaptSql(sql), args, argTypes, rse);
    }

    @Override
    public <T> List<T> query(String sql, Object[] args, int[] argTypes, RowMapper<T> rowMapper) throws DataAccessException {
        return super.query(adaptSql(sql), args, argTypes, rowMapper);
    }

    @Override
    public void query(String sql, Object[] args, int[] argTypes, RowCallbackHandler rch) throws DataAccessException {
        super.query(adaptSql(sql), args, argTypes, rch);
    }

    @Override
    public <T> T query(String sql, @Nullable Object[] args, ResultSetExtractor<T> rse) throws DataAccessException {
        return super.query(adaptSql(sql), args, rse);
    }

    @Override
    public <T> List<T> query(String sql, @Nullable Object[] args, RowMapper<T> rowMapper) throws DataAccessException {
        return super.query(adaptSql(sql), args, rowMapper);
    }

    @Override
    public void query(String sql, @Nullable Object[] args, RowCallbackHandler rch) throws DataAccessException {
        super.query(adaptSql(sql), args, rch);
    }

    @Override
    public <T> List<T> query(String sql, RowMapper<T> rowMapper, @Nullable Object... args) throws DataAccessException {
        return super.query(adaptSql(sql), rowMapper, args);
    }

    @Override
    public <T> T queryForObject(String sql, RowMapper<T> rowMapper, @Nullable Object... args) throws DataAccessException {
        return super.queryForObject(adaptSql(sql), rowMapper, args);
    }

    @Override
    public <T> T queryForObject(String sql, Class<T> requiredType, @Nullable Object... args) throws DataAccessException {
        return super.queryForObject(adaptSql(sql), requiredType, args);
    }

    @Override
    public Map<String, Object> queryForMap(String sql, @Nullable Object... args) throws DataAccessException {
        return super.queryForMap(adaptSql(sql), args);
    }

    @Override
    public <T> List<T> queryForList(String sql, Class<T> elementType, @Nullable Object... args) throws DataAccessException {
        return super.queryForList(adaptSql(sql), elementType, args);
    }

    @Override
    public List<Map<String, Object>> queryForList(String sql, @Nullable Object... args) throws DataAccessException {
        return super.queryForList(adaptSql(sql), args);
    }

    @Override
    public int update(String sql) throws DataAccessException {
        return super.update(adaptSql(sql));
    }

    @Override
    public int update(String sql, @Nullable PreparedStatementSetter pss) throws DataAccessException {
        return super.update(adaptSql(sql), pss);
    }

    @Override
    public int update(String sql, @Nullable Object... args) throws DataAccessException {
        return super.update(adaptSql(sql), args);
    }

    @Override
    public int update(String sql, Object[] args, int[] argTypes) throws DataAccessException {
        return super.update(adaptSql(sql), args, argTypes);
    }

    @Override
    public int[] batchUpdate(String... sql) throws DataAccessException {
        if (sql == null) return super.batchUpdate((String[]) null);
        String[] adapted = new String[sql.length];
        for (int i = 0; i < sql.length; i++) {
            adapted[i] = adaptSql(sql[i]);
        }
        return super.batchUpdate(adapted);
    }

    @Override
    public int[] batchUpdate(String sql, BatchPreparedStatementSetter pss) throws DataAccessException {
        return super.batchUpdate(adaptSql(sql), pss);
    }

    @Override
    public int[] batchUpdate(String sql, List<Object[]> batchArgs) throws DataAccessException {
        return super.batchUpdate(adaptSql(sql), batchArgs);
    }

    @Override
    public int[] batchUpdate(String sql, List<Object[]> batchArgs, int[] argTypes) throws DataAccessException {
        return super.batchUpdate(adaptSql(sql), batchArgs, argTypes);
    }

    @Override
    public <T> int[][] batchUpdate(String sql, Collection<T> batchArgs, int batchSize, ParameterizedPreparedStatementSetter<T> pss) throws DataAccessException {
        return super.batchUpdate(adaptSql(sql), batchArgs, batchSize, pss);
    }
}
