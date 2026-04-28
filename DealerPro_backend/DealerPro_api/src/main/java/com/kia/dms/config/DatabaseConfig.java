package com.kia.dms.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

@Configuration
@EnableAsync
@EnableScheduling
public class DatabaseConfig {

    @Value("${spring.datasource.driver-class-name}")
    private String driverClassName;

    @Bean
    public PlatformTransactionManager transactionManager(DataSource dataSource) throws SQLException {
        // Configure database-specific settings
        if (driverClassName.contains("sqlite")) {
            // SQLite specific configuration
            try (Connection conn = dataSource.getConnection();
                 Statement stmt = conn.createStatement()) {
                // Enable foreign keys for SQLite
                stmt.execute("PRAGMA foreign_keys = ON");
            }
        }
        // MySQL doesn't need special configuration here as it's handled by Hibernate
        return new DataSourceTransactionManager(dataSource);
    }
}
