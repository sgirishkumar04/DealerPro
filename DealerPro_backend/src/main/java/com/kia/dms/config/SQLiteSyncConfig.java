package com.kia.dms.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;

/**
 * Configuration for SQLite synchronization
 * This creates a secondary SQLite connection for syncing data from MySQL
 */
@Configuration
@ConditionalOnProperty(name = "app.sqlite.sync.enabled", havingValue = "true")
public class SQLiteSyncConfig {

    private static final Logger log = LoggerFactory.getLogger(SQLiteSyncConfig.class);

    @Value("${app.sqlite.sync.path}")
    private String sqlitePath;

    @Bean(name = "sqliteDataSource")
    public DataSource sqliteDataSource() {
        log.info("Initializing SQLite sync datasource at: {}", sqlitePath);
        
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.sqlite.JDBC");
        dataSource.setUrl("jdbc:sqlite:" + sqlitePath);
        
        return dataSource;
    }

    @Bean(name = "sqliteJdbcTemplate")
    public JdbcTemplate sqliteJdbcTemplate() {
        JdbcTemplate template = new JdbcTemplate(sqliteDataSource());
        
        // Enable foreign keys for SQLite
        try {
            template.execute("PRAGMA foreign_keys = ON");
            log.info("SQLite foreign keys enabled");
        } catch (Exception e) {
            log.error("Failed to enable SQLite foreign keys", e);
        }
        
        return template;
    }
}
