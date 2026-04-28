package com.kia.dms.sync;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler for periodic database synchronization
 */
@Component
@ConditionalOnProperty(name = "app.sqlite.sync.enabled", havingValue = "true")
public class DatabaseSyncScheduler {

    private static final Logger log = LoggerFactory.getLogger(DatabaseSyncScheduler.class);

    @Autowired
    private MySQLToSQLiteSyncService syncService;

    /**
     * Sync all tables on application startup
     */
    @EventListener(ApplicationReadyEvent.class)
    public void syncOnStartup() {
        log.info("Application started - initiating full database sync");
        syncService.syncAllTables();
    }

    /**
     * Periodic full sync every 5 minutes
     * This ensures SQLite stays in sync even if individual syncs fail
     */
    @Scheduled(fixedDelay = 300000, initialDelay = 300000) // 5 minutes
    public void periodicFullSync() {
        log.info("Starting periodic full database sync");
        syncService.syncAllTables();
    }
}
