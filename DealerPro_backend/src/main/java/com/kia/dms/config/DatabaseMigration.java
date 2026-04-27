package com.kia.dms.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(1) // Run before DataSeeder
public class DatabaseMigration implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseMigration.class);
    private final JdbcTemplate jdbcTemplate;

    public DatabaseMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        logger.info("Checking database schema for required columns...");
        
        try {
            // Check if account lock columns exist
            addColumnIfNotExists("users", "failed_login_attempts", "INTEGER DEFAULT NULL");
            addColumnIfNotExists("users", "account_locked_until", "TEXT DEFAULT NULL");
            addColumnIfNotExists("users", "last_failed_login", "TEXT DEFAULT NULL");
            
            logger.info("✅ Database schema check completed successfully.");
        } catch (Exception e) {
            logger.error("❌ Error during database migration: {}", e.getMessage());
        }
    }

    private void addColumnIfNotExists(String tableName, String columnName, String columnDefinition) {
        try {
            // Try to query the column - if it doesn't exist, this will fail
            jdbcTemplate.queryForList("SELECT " + columnName + " FROM " + tableName + " LIMIT 1");
            logger.info("Column '{}' already exists in table '{}'", columnName, tableName);
        } catch (Exception e) {
            // Column doesn't exist, add it
            try {
                String sql = "ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + columnDefinition;
                jdbcTemplate.execute(sql);
                logger.info("✅ Added column '{}' to table '{}'", columnName, tableName);
            } catch (Exception ex) {
                logger.error("❌ Failed to add column '{}' to table '{}': {}", columnName, tableName, ex.getMessage());
            }
        }
    }
}
