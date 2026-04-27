package com.kia.dms.sync;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Service to synchronize data from MySQL to SQLite
 * This keeps SQLite updated for table viewing purposes
 */
@Service
@ConditionalOnProperty(name = "app.sqlite.sync.enabled", havingValue = "true")
public class MySQLToSQLiteSyncService {

    private static final Logger log = LoggerFactory.getLogger(MySQLToSQLiteSyncService.class);

    @Autowired
    private JdbcTemplate mysqlJdbcTemplate; // Primary MySQL datasource

    @Autowired
    @Qualifier("sqliteJdbcTemplate")
    private JdbcTemplate sqliteJdbcTemplate; // Secondary SQLite datasource

    // Tables in order of dependencies (parent tables first)
    private static final String[] SYNC_TABLES = {
        "roles", "dealers", "users", "admins", "managers", "kia_cars", "vehicles",
        "inventory", "leads", "test_drives", "orders", "service_orders",
        "parts", "purchase_orders", "transactions", "dealer_performance",
        "ai_chat_logs", "chat_logs"
    };

    /**
     * Synchronize a specific table from MySQL to SQLite
     */
    @Async
    @Transactional
    public void syncTable(String tableName) {
        try {
            log.info("Starting sync for table: {}", tableName);
            
            // Get data from MySQL
            List<Map<String, Object>> mysqlData = mysqlJdbcTemplate.queryForList(
                "SELECT * FROM " + tableName
            );
            
            if (mysqlData.isEmpty()) {
                log.debug("No data to sync for table: {}", tableName);
                return;
            }
            
            // Clear SQLite table
            sqliteJdbcTemplate.execute("DELETE FROM " + tableName);
            
            // Insert data into SQLite
            for (Map<String, Object> row : mysqlData) {
                insertRowIntoSQLite(tableName, row);
            }
            
            log.info("Successfully synced {} records for table: {}", mysqlData.size(), tableName);
            
        } catch (Exception e) {
            log.error("Failed to sync table: {}", tableName, e);
        }
    }

    /**
     * Synchronize all tables from MySQL to SQLite
     */
    @Async
    public void syncAllTables() {
        log.info("Starting full database sync from MySQL to SQLite");
        
        long startTime = System.currentTimeMillis();
        int totalRecords = 0;
        
        for (String table : SYNC_TABLES) {
            try {
                List<Map<String, Object>> data = mysqlJdbcTemplate.queryForList(
                    "SELECT * FROM " + table
                );
                
                if (!data.isEmpty()) {
                    sqliteJdbcTemplate.execute("DELETE FROM " + table);
                    
                    for (Map<String, Object> row : data) {
                        insertRowIntoSQLite(table, row);
                    }
                    
                    totalRecords += data.size();
                    log.info("Synced {} records for table: {}", data.size(), table);
                }
                
            } catch (Exception e) {
                log.error("Failed to sync table: {}", table, e);
            }
        }
        
        long duration = System.currentTimeMillis() - startTime;
        log.info("Full sync completed: {} records in {} ms", totalRecords, duration);
    }

    /**
     * Insert a single row into SQLite
     */
    private void insertRowIntoSQLite(String tableName, Map<String, Object> row) {
        try {
            StringBuilder columns = new StringBuilder();
            StringBuilder placeholders = new StringBuilder();
            Object[] values = new Object[row.size()];
            
            int index = 0;
            for (Map.Entry<String, Object> entry : row.entrySet()) {
                if (index > 0) {
                    columns.append(", ");
                    placeholders.append(", ");
                }
                columns.append(entry.getKey());
                placeholders.append("?");
                values[index++] = entry.getValue();
            }
            
            String sql = String.format(
                "INSERT INTO %s (%s) VALUES (%s)",
                tableName, columns, placeholders
            );
            
            sqliteJdbcTemplate.update(sql, values);
            
        } catch (Exception e) {
            log.error("Failed to insert row into SQLite table: {}", tableName, e);
        }
    }

    /**
     * Sync a specific record by ID
     */
    @Async
    public void syncRecordById(String tableName, Long id) {
        try {
            log.debug("Syncing record {} from table: {}", id, tableName);
            
            // Get record from MySQL
            List<Map<String, Object>> records = mysqlJdbcTemplate.queryForList(
                "SELECT * FROM " + tableName + " WHERE id = ?", id
            );
            
            if (records.isEmpty()) {
                // Record deleted in MySQL, delete from SQLite
                sqliteJdbcTemplate.update("DELETE FROM " + tableName + " WHERE id = ?", id);
                log.debug("Deleted record {} from SQLite table: {}", id, tableName);
                return;
            }
            
            Map<String, Object> record = records.get(0);
            
            // Check if record exists in SQLite
            Integer count = sqliteJdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + tableName + " WHERE id = ?",
                Integer.class, id
            );
            
            if (count != null && count > 0) {
                // Update existing record
                updateRowInSQLite(tableName, record);
            } else {
                // Insert new record
                insertRowIntoSQLite(tableName, record);
            }
            
            log.debug("Successfully synced record {} for table: {}", id, tableName);
            
        } catch (Exception e) {
            log.error("Failed to sync record {} from table: {}", id, tableName, e);
        }
    }

    /**
     * Update a single row in SQLite
     */
    private void updateRowInSQLite(String tableName, Map<String, Object> row) {
        try {
            StringBuilder setClause = new StringBuilder();
            Object[] values = new Object[row.size()];
            
            int index = 0;
            Long id = null;
            
            for (Map.Entry<String, Object> entry : row.entrySet()) {
                if ("id".equals(entry.getKey())) {
                    id = ((Number) entry.getValue()).longValue();
                    continue;
                }
                
                if (index > 0) {
                    setClause.append(", ");
                }
                setClause.append(entry.getKey()).append(" = ?");
                values[index++] = entry.getValue();
            }
            
            // Add ID as last parameter
            Object[] finalValues = new Object[index + 1];
            System.arraycopy(values, 0, finalValues, 0, index);
            finalValues[index] = id;
            
            String sql = String.format(
                "UPDATE %s SET %s WHERE id = ?",
                tableName, setClause
            );
            
            sqliteJdbcTemplate.update(sql, finalValues);
            
        } catch (Exception e) {
            log.error("Failed to update row in SQLite table: {}", tableName, e);
        }
    }
}
