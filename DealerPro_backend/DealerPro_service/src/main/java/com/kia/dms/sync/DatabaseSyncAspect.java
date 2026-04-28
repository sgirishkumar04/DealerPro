package com.kia.dms.sync;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

/**
 * AOP Aspect to automatically sync data to SQLite after database operations
 */
@Aspect
@Component
@ConditionalOnProperty(name = "app.sqlite.sync.enabled", havingValue = "true")
public class DatabaseSyncAspect {

    private static final Logger log = LoggerFactory.getLogger(DatabaseSyncAspect.class);

    @Autowired
    private MySQLToSQLiteSyncService syncService;

    /**
     * Sync after save operations
     */
    @AfterReturning(
        pointcut = "execution(* com.kia.dms.modules..repository.*Repository.save(..))",
        returning = "result"
    )
    public void syncAfterSave(JoinPoint joinPoint, Object result) {
        try {
            if (result != null) {
                String tableName = extractTableName(result.getClass());
                Long id = extractId(result);
                
                if (tableName != null && id != null) {
                    log.debug("Syncing after save: {} with id {}", tableName, id);
                    syncService.syncRecordById(tableName, id);
                }
            }
        } catch (Exception e) {
            log.error("Failed to sync after save", e);
        }
    }

    /**
     * Sync after delete operations
     */
    @AfterReturning(
        pointcut = "execution(* com.kia.dms.modules..repository.*Repository.delete*(..))"
    )
    public void syncAfterDelete(JoinPoint joinPoint) {
        try {
            Object[] args = joinPoint.getArgs();
            if (args.length > 0 && args[0] != null) {
                String tableName = extractTableName(args[0].getClass());
                Long id = extractId(args[0]);
                
                if (tableName != null && id != null) {
                    log.debug("Syncing after delete: {} with id {}", tableName, id);
                    syncService.syncRecordById(tableName, id);
                }
            }
        } catch (Exception e) {
            log.error("Failed to sync after delete", e);
        }
    }

    /**
     * Sync after bulk operations
     */
    @AfterReturning(
        pointcut = "execution(* com.kia.dms.modules..repository.*Repository.saveAll(..))"
    )
    public void syncAfterBulkSave(JoinPoint joinPoint) {
        try {
            Object[] args = joinPoint.getArgs();
            if (args.length > 0 && args[0] instanceof Iterable) {
                Iterable<?> entities = (Iterable<?>) args[0];
                for (Object entity : entities) {
                    String tableName = extractTableName(entity.getClass());
                    Long id = extractId(entity);
                    
                    if (tableName != null && id != null) {
                        syncService.syncRecordById(tableName, id);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to sync after bulk save", e);
        }
    }

    /**
     * Extract table name from entity class
     */
    private String extractTableName(Class<?> entityClass) {
        try {
            // Check for @Table annotation
            if (entityClass.isAnnotationPresent(jakarta.persistence.Table.class)) {
                jakarta.persistence.Table table = entityClass.getAnnotation(jakarta.persistence.Table.class);
                return table.name();
            }
            
            // Fallback: convert class name to table name
            String className = entityClass.getSimpleName();
            if (className.endsWith("Entity")) {
                className = className.substring(0, className.length() - 6);
            }
            
            // Convert camelCase to snake_case
            return className.replaceAll("([a-z])([A-Z])", "$1_$2").toLowerCase() + "s";
            
        } catch (Exception e) {
            log.error("Failed to extract table name from class: {}", entityClass.getName(), e);
            return null;
        }
    }

    /**
     * Extract ID from entity
     */
    private Long extractId(Object entity) {
        try {
            Method getIdMethod = entity.getClass().getMethod("getId");
            Object id = getIdMethod.invoke(entity);
            
            if (id instanceof Long) {
                return (Long) id;
            } else if (id instanceof Integer) {
                return ((Integer) id).longValue();
            }
            
        } catch (Exception e) {
            log.debug("Failed to extract ID from entity: {}", entity.getClass().getName());
        }
        
        return null;
    }
}
