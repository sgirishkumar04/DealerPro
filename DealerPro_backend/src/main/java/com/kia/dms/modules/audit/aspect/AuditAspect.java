package com.kia.dms.modules.audit.aspect;

import com.kia.dms.modules.audit.service.AuditLogService;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class AuditAspect {

    private static final Logger logger = LoggerFactory.getLogger(AuditAspect.class);

    @Autowired
    private AuditLogService auditLogService;

    /**
     * Log CREATE operations
     */
    @AfterReturning(
        pointcut = "execution(* com.kia.dms.modules.*.controller.*Controller.create*(..)) || " +
                   "execution(* com.kia.dms.modules.*.controller.*Controller.add*(..))",
        returning = "result"
    )
    public void logCreate(JoinPoint joinPoint, Object result) {
        try {
            String methodName = joinPoint.getSignature().getName();
            String className = joinPoint.getTarget().getClass().getSimpleName();
            String entityName = extractEntityName(className);
            
            Long entityId = extractEntityId(result);
            if (entityId != null) {
                auditLogService.logAudit(entityName, entityId, "CREATE", 
                    String.format("Created new %s with ID %d", entityName, entityId));
                logger.info("Audit logged: CREATE {} with ID {}", entityName, entityId);
            }
        } catch (Exception e) {
            logger.error("Failed to log CREATE audit: {}", e.getMessage());
        }
    }

    /**
     * Log UPDATE operations
     */
    @AfterReturning(
        pointcut = "execution(* com.kia.dms.modules.*.controller.*Controller.update*(..)) || " +
                   "execution(* com.kia.dms.modules.*.controller.*Controller.edit*(..))",
        returning = "result"
    )
    public void logUpdate(JoinPoint joinPoint, Object result) {
        try {
            String methodName = joinPoint.getSignature().getName();
            String className = joinPoint.getTarget().getClass().getSimpleName();
            String entityName = extractEntityName(className);
            
            // Try to get ID from method arguments
            Object[] args = joinPoint.getArgs();
            Long entityId = null;
            Object requestData = null;
            
            for (Object arg : args) {
                if (arg instanceof Long) {
                    entityId = (Long) arg;
                } else if (arg instanceof Integer) {
                    entityId = ((Integer) arg).longValue();
                } else if (arg instanceof java.util.Map) {
                    requestData = arg;
                } else if (arg != null && !arg.getClass().getName().startsWith("java.lang") 
                          && !arg.getClass().getName().startsWith("org.springframework")) {
                    requestData = arg;
                }
            }
            
            if (entityId == null) {
                entityId = extractEntityId(result);
            }
            
            if (entityId != null) {
                String description = buildUpdateDescription(entityName, entityId, requestData);
                auditLogService.logAudit(entityName, entityId, "UPDATE", description);
                logger.info("Audit logged: UPDATE {} with ID {}", entityName, entityId);
            }
        } catch (Exception e) {
            logger.error("Failed to log UPDATE audit: {}", e.getMessage());
        }
    }
    
    /**
     * Build detailed update description
     */
    private String buildUpdateDescription(String entityName, Long entityId, Object requestData) {
        if (requestData == null) {
            return String.format("Updated %s (ID: %d)", entityName, entityId);
        }
        
        try {
            StringBuilder description = new StringBuilder();
            
            // Handle Map-based requests (like DealerController)
            if (requestData instanceof java.util.Map) {
                @SuppressWarnings("unchecked")
                java.util.Map<String, Object> dataMap = (java.util.Map<String, Object>) requestData;
                return buildDescriptionFromMap(entityName, entityId, dataMap);
            }
            
            // Handle DTO-based requests
            description.append(String.format("Updated %s (ID: %d)", entityName, entityId));
            
            var fields = requestData.getClass().getDeclaredFields();
            int fieldCount = 0;
            
            for (var field : fields) {
                if (fieldCount >= 3) break;
                
                field.setAccessible(true);
                Object value = field.get(requestData);
                
                if (value != null && !field.getName().equals("id") && !field.getName().startsWith("$")) {
                    String fieldName = formatFieldName(field.getName());
                    String fieldValue = formatFieldValue(field.getName(), value);
                    
                    if (fieldCount == 0) {
                        description.append(" - ");
                    } else {
                        description.append(", ");
                    }
                    
                    description.append(fieldName).append(": ").append(fieldValue);
                    fieldCount++;
                }
            }
            
            return description.toString();
        } catch (Exception e) {
            logger.debug("Could not build detailed description: {}", e.getMessage());
            return String.format("Updated %s (ID: %d)", entityName, entityId);
        }
    }
    
    /**
     * Build description from Map data
     */
    private String buildDescriptionFromMap(String entityName, Long entityId, java.util.Map<String, Object> dataMap) {
        StringBuilder description = new StringBuilder();
        
        // Create a more descriptive opening based on entity type with key identifying info
        String entityDisplayName = getEntityDisplayName(entityName);
        String headerInfo = buildHeaderInfo(entityName, entityId, dataMap);
        description.append(headerInfo);
        
        // Define priority fields for different entities
        String[] priorityFields = getPriorityFields(entityName);
        
        java.util.List<String> changes = new java.util.ArrayList<>();
        
        for (String fieldName : priorityFields) {
            Object value = dataMap.get(fieldName);
            if (value != null && !value.toString().isEmpty()) {
                // Skip fields already shown in header
                if (shouldSkipInDetails(entityName, fieldName)) {
                    continue;
                }
                String changeDescription = formatFieldChange(entityName, fieldName, value);
                if (changeDescription != null && !changeDescription.isEmpty()) {
                    changes.add(changeDescription);
                }
            }
        }
        
        // If no priority fields found, show any available fields
        if (changes.isEmpty()) {
            for (java.util.Map.Entry<String, Object> entry : dataMap.entrySet()) {
                String key = entry.getKey();
                Object value = entry.getValue();
                
                if (value != null && !key.equals("id") && !value.toString().isEmpty() && !shouldSkipInDetails(entityName, key)) {
                    String changeDescription = formatFieldChange(entityName, key, value);
                    if (changeDescription != null && !changeDescription.isEmpty()) {
                        changes.add(changeDescription);
                        if (changes.size() >= 5) break; // Limit to 5 fields
                    }
                }
            }
        }
        
        // Build the final description
        if (!changes.isEmpty()) {
            description.append(" → Changes: ");
            description.append(String.join(", ", changes));
        }
        
        return description.toString();
    }
    
    /**
     * Build header info with key identifying information
     */
    private String buildHeaderInfo(String entityName, Long entityId, java.util.Map<String, Object> dataMap) {
        String lowerEntity = entityName.toLowerCase();
        String displayName = getEntityDisplayName(entityName);
        
        // Dealer: Show Dealer ID and Manager ID
        if (lowerEntity.contains("dealer")) {
            Object managerId = dataMap.get("managerId");
            if (managerId != null && !managerId.toString().isEmpty()) {
                return String.format("Updated %s ID: %d with Manager ID: %s", displayName, entityId, managerId);
            }
            return String.format("Updated %s ID: %d", displayName, entityId);
        }
        
        // User/Manager/Admin: Show User ID and Role
        if (lowerEntity.contains("user") || lowerEntity.contains("admin") || lowerEntity.contains("manager")) {
            Object role = dataMap.get("role");
            Object username = dataMap.get("username");
            if (role != null && !role.toString().isEmpty()) {
                return String.format("Updated %s ID: %d (%s)", displayName, entityId, role);
            } else if (username != null && !username.toString().isEmpty()) {
                return String.format("Updated %s ID: %d (%s)", displayName, entityId, username);
            }
            return String.format("Updated %s ID: %d", displayName, entityId);
        }
        
        // Vehicle: Show Vehicle ID and Model
        if (lowerEntity.contains("vehicle") || lowerEntity.contains("car")) {
            Object model = dataMap.get("model");
            if (model != null && !model.toString().isEmpty()) {
                return String.format("Updated %s ID: %d (Model: %s)", displayName, entityId, model);
            }
            return String.format("Updated %s ID: %d", displayName, entityId);
        }
        
        // Service Order: Show Service Order ID and Status
        if (lowerEntity.contains("service")) {
            Object status = dataMap.get("status");
            if (status != null && !status.toString().isEmpty()) {
                return String.format("Updated %s ID: %d (Status: %s)", displayName, entityId, status);
            }
            return String.format("Updated %s ID: %d", displayName, entityId);
        }
        
        // Sales Order: Show Order ID and Status
        if (lowerEntity.contains("order") || lowerEntity.contains("sale")) {
            Object status = dataMap.get("status");
            Object orderNumber = dataMap.get("orderNumber");
            if (orderNumber != null && !orderNumber.toString().isEmpty()) {
                return String.format("Updated %s ID: %d (Order #%s)", displayName, entityId, orderNumber);
            } else if (status != null && !status.toString().isEmpty()) {
                return String.format("Updated %s ID: %d (Status: %s)", displayName, entityId, status);
            }
            return String.format("Updated %s ID: %d", displayName, entityId);
        }
        
        // Lead: Show Lead ID and Name
        if (lowerEntity.contains("lead")) {
            Object name = dataMap.get("name");
            if (name != null && !name.toString().isEmpty()) {
                return String.format("Updated %s ID: %d (Name: %s)", displayName, entityId, name);
            }
            return String.format("Updated %s ID: %d", displayName, entityId);
        }
        
        // Test Drive: Show Test Drive ID and Status
        if (lowerEntity.contains("test") && lowerEntity.contains("drive")) {
            Object status = dataMap.get("status");
            if (status != null && !status.toString().isEmpty()) {
                return String.format("Updated %s ID: %d (Status: %s)", displayName, entityId, status);
            }
            return String.format("Updated %s ID: %d", displayName, entityId);
        }
        
        // Part: Show Part ID and Name
        if (lowerEntity.contains("part")) {
            Object partName = dataMap.get("partName");
            Object name = dataMap.get("name");
            String displayPartName = partName != null ? partName.toString() : (name != null ? name.toString() : null);
            if (displayPartName != null && !displayPartName.isEmpty()) {
                return String.format("Updated %s ID: %d (Part: %s)", displayName, entityId, displayPartName);
            }
            return String.format("Updated %s ID: %d", displayName, entityId);
        }
        
        // Default format
        return String.format("Updated %s ID: %d", displayName, entityId);
    }
    
    /**
     * Check if field should be skipped in details (already shown in header)
     */
    private boolean shouldSkipInDetails(String entityName, String fieldName) {
        String lowerEntity = entityName.toLowerCase();
        String lowerField = fieldName.toLowerCase();
        
        // Skip managerId in details for Dealer (shown in header)
        if (lowerEntity.contains("dealer") && lowerField.equals("managerid")) {
            return true;
        }
        
        // Skip role/username in details for User (shown in header)
        if ((lowerEntity.contains("user") || lowerEntity.contains("admin") || lowerEntity.contains("manager")) 
            && (lowerField.equals("role") || lowerField.equals("username"))) {
            return true;
        }
        
        // Skip model in details for Vehicle (shown in header)
        if ((lowerEntity.contains("vehicle") || lowerEntity.contains("car")) && lowerField.equals("model")) {
            return true;
        }
        
        // Skip status in details for Service/Order/TestDrive (shown in header)
        if ((lowerEntity.contains("service") || lowerEntity.contains("order") || lowerEntity.contains("sale") 
            || (lowerEntity.contains("test") && lowerEntity.contains("drive"))) && lowerField.equals("status")) {
            return true;
        }
        
        // Skip orderNumber in details for Order (shown in header)
        if ((lowerEntity.contains("order") || lowerEntity.contains("sale")) && lowerField.equals("ordernumber")) {
            return true;
        }
        
        // Skip name in details for Lead/Part (shown in header)
        if ((lowerEntity.contains("lead") || lowerEntity.contains("part")) && lowerField.equals("name")) {
            return true;
        }
        
        // Skip partName in details for Part (shown in header)
        if (lowerEntity.contains("part") && lowerField.equals("partname")) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Get entity display name
     */
    private String getEntityDisplayName(String entityName) {
        String lowerName = entityName.toLowerCase();
        
        if (lowerName.contains("dealer")) return "Dealer";
        if (lowerName.contains("manager")) return "Manager";
        if (lowerName.contains("admin")) return "Admin User";
        if (lowerName.contains("user")) return "User";
        if (lowerName.contains("vehicle") || lowerName.contains("car")) return "Vehicle";
        if (lowerName.contains("service")) return "Service Order";
        if (lowerName.contains("order")) return "Sales Order";
        if (lowerName.contains("lead")) return "Lead";
        if (lowerName.contains("test drive")) return "Test Drive";
        if (lowerName.contains("part")) return "Part";
        if (lowerName.contains("inventory")) return "Inventory Item";
        
        return entityName;
    }
    
    /**
     * Format field change with context
     */
    private String formatFieldChange(String entityName, String fieldName, Object value) {
        String lowerEntity = entityName.toLowerCase();
        String lowerField = fieldName.toLowerCase();
        String strValue = value.toString();
        
        // Truncate very long values
        if (strValue.length() > 50) {
            strValue = strValue.substring(0, 47) + "...";
        }
        
        // Dealer-specific fields
        if (lowerEntity.contains("dealer")) {
            if (lowerField.equals("managerid")) {
                return String.format("Assigned Manager (ID: %s)", strValue);
            } else if (lowerField.equals("name")) {
                return String.format("Dealer Name changed to '%s'", strValue);
            } else if (lowerField.equals("location")) {
                return String.format("Location updated to '%s'", strValue);
            } else if (lowerField.equals("email")) {
                return String.format("Email set to '%s'", strValue);
            } else if (lowerField.equals("contactnumber")) {
                return String.format("Contact Number: %s", strValue);
            } else if (lowerField.equals("status")) {
                return String.format("Status changed to '%s'", strValue);
            }
        }
        
        // User-specific fields
        if (lowerEntity.contains("user") || lowerEntity.contains("admin") || lowerEntity.contains("manager")) {
            if (lowerField.equals("username")) {
                return String.format("Username set to '%s'", strValue);
            } else if (lowerField.equals("email")) {
                return String.format("Email updated to '%s'", strValue);
            } else if (lowerField.equals("role")) {
                return String.format("Role changed to '%s'", strValue);
            } else if (lowerField.equals("fullname") || lowerField.equals("name")) {
                return String.format("Full Name: '%s'", strValue);
            } else if (lowerField.equals("dealerid")) {
                return String.format("Assigned to Dealer (ID: %s)", strValue);
            } else if (lowerField.equals("status")) {
                return String.format("Account Status: '%s'", strValue);
            }
        }
        
        // Vehicle-specific fields
        if (lowerEntity.contains("vehicle") || lowerEntity.contains("car")) {
            if (lowerField.equals("model")) {
                return String.format("Model: '%s'", strValue);
            } else if (lowerField.equals("vin")) {
                return String.format("VIN: %s", strValue);
            } else if (lowerField.equals("color")) {
                return String.format("Color: '%s'", strValue);
            } else if (lowerField.equals("year")) {
                return String.format("Year: %s", strValue);
            } else if (lowerField.equals("price")) {
                return String.format("Price: ₹%s", strValue);
            } else if (lowerField.equals("kiacarid")) {
                return String.format("Kia Car Model (ID: %s)", strValue);
            } else if (lowerField.equals("dealerid")) {
                return String.format("Dealer (ID: %s)", strValue);
            }
        }
        
        // Service-specific fields
        if (lowerEntity.contains("service")) {
            if (lowerField.equals("servicetype")) {
                return String.format("Service Type: '%s'", strValue);
            } else if (lowerField.equals("status")) {
                return String.format("Status: '%s'", strValue);
            } else if (lowerField.equals("cost")) {
                return String.format("Cost: ₹%s", strValue);
            } else if (lowerField.equals("vehicleid")) {
                return String.format("Vehicle (ID: %s)", strValue);
            } else if (lowerField.equals("dealerid")) {
                return String.format("Dealer (ID: %s)", strValue);
            }
        }
        
        // Order-specific fields
        if (lowerEntity.contains("order") || lowerEntity.contains("sale")) {
            if (lowerField.equals("ordernumber")) {
                return String.format("Order Number: %s", strValue);
            } else if (lowerField.equals("status")) {
                return String.format("Order Status: '%s'", strValue);
            } else if (lowerField.equals("totalamount") || lowerField.equals("amount")) {
                return String.format("Total Amount: ₹%s", strValue);
            } else if (lowerField.equals("customername")) {
                return String.format("Customer: '%s'", strValue);
            } else if (lowerField.equals("vehicleid")) {
                return String.format("Vehicle (ID: %s)", strValue);
            } else if (lowerField.equals("dealerid")) {
                return String.format("Dealer (ID: %s)", strValue);
            }
        }
        
        // Lead-specific fields
        if (lowerEntity.contains("lead")) {
            if (lowerField.equals("name")) {
                return String.format("Lead Name: '%s'", strValue);
            } else if (lowerField.equals("email")) {
                return String.format("Email: '%s'", strValue);
            } else if (lowerField.equals("phone") || lowerField.equals("contactnumber")) {
                return String.format("Phone: %s", strValue);
            } else if (lowerField.equals("status")) {
                return String.format("Lead Status: '%s'", strValue);
            } else if (lowerField.equals("source")) {
                return String.format("Source: '%s'", strValue);
            } else if (lowerField.equals("kiacarid")) {
                return String.format("Interested in Car (ID: %s)", strValue);
            } else if (lowerField.equals("dealerid")) {
                return String.format("Assigned to Dealer (ID: %s)", strValue);
            }
        }
        
        // Test Drive-specific fields
        if (lowerEntity.contains("test") && lowerEntity.contains("drive")) {
            if (lowerField.equals("scheduleddate")) {
                return String.format("Scheduled Date: %s", strValue);
            } else if (lowerField.equals("status")) {
                return String.format("Status: '%s'", strValue);
            } else if (lowerField.equals("leadid")) {
                return String.format("Lead (ID: %s)", strValue);
            } else if (lowerField.equals("vehicleid")) {
                return String.format("Vehicle (ID: %s)", strValue);
            } else if (lowerField.equals("dealerid")) {
                return String.format("Dealer (ID: %s)", strValue);
            }
        }
        
        // Part-specific fields
        if (lowerEntity.contains("part")) {
            if (lowerField.equals("partname") || lowerField.equals("name")) {
                return String.format("Part Name: '%s'", strValue);
            } else if (lowerField.equals("partnumber")) {
                return String.format("Part Number: %s", strValue);
            } else if (lowerField.equals("quantity")) {
                return String.format("Quantity: %s units", strValue);
            } else if (lowerField.equals("price")) {
                return String.format("Price: ₹%s", strValue);
            } else if (lowerField.equals("dealerid")) {
                return String.format("Dealer (ID: %s)", strValue);
            }
        }
        
        // Generic fallback with better formatting
        String displayName = formatFieldName(fieldName);
        return String.format("%s: '%s'", displayName, strValue);
    }
    
    /**
     * Get priority fields for entity type
     */
    private String[] getPriorityFields(String entityName) {
        String lowerName = entityName.toLowerCase();
        
        if (lowerName.contains("dealer")) {
            return new String[]{"name", "location", "managerId", "email", "contactNumber"};
        } else if (lowerName.contains("user") || lowerName.contains("admin") || lowerName.contains("manager")) {
            return new String[]{"username", "email", "role", "name", "fullName"};
        } else if (lowerName.contains("vehicle") || lowerName.contains("car")) {
            return new String[]{"model", "vin", "color", "year", "price"};
        } else if (lowerName.contains("service")) {
            return new String[]{"serviceType", "status", "cost", "description"};
        } else if (lowerName.contains("order") || lowerName.contains("sale")) {
            return new String[]{"orderNumber", "status", "totalAmount", "customerName"};
        } else if (lowerName.contains("lead")) {
            return new String[]{"name", "email", "phone", "status", "source"};
        } else if (lowerName.contains("part")) {
            return new String[]{"partName", "partNumber", "quantity", "price"};
        }
        
        // Default priority fields
        return new String[]{"name", "title", "description", "status", "type"};
    }
    
    /**
     * Format field name from camelCase to readable format
     */
    private String formatFieldName(String fieldName) {
        // Handle special cases
        if (fieldName.equalsIgnoreCase("managerId")) {
            return "Manager ID";
        } else if (fieldName.equalsIgnoreCase("dealerId")) {
            return "Dealer ID";
        } else if (fieldName.equalsIgnoreCase("userId")) {
            return "User ID";
        } else if (fieldName.equalsIgnoreCase("vehicleId")) {
            return "Vehicle ID";
        }
        
        // Convert camelCase to Title Case
        String result = fieldName.replaceAll("([A-Z])", " $1").trim();
        if (result.length() > 0) {
            result = Character.toUpperCase(result.charAt(0)) + result.substring(1);
        }
        return result;
    }
    
    /**
     * Format field value for display
     */
    private String formatFieldValue(String fieldName, Object value) {
        if (value == null) {
            return "null";
        }
        
        String strValue = value.toString();
        String lowerField = fieldName.toLowerCase();
        
        // Mask PII in logs
        if (lowerField.contains("email")) {
            return com.kia.dms.common.utils.MaskingUtil.maskEmail(strValue);
        } else if (lowerField.contains("phone") || lowerField.contains("contactnumber")) {
            return com.kia.dms.common.utils.MaskingUtil.maskPhone(strValue);
        }
        
        // Truncate long values
        if (strValue.length() > 40) {
            return strValue.substring(0, 37) + "...";
        }
        
        return strValue;
    }

    /**
     * Log DELETE operations
     */
    @AfterReturning(
        pointcut = "execution(* com.kia.dms.modules.*.controller.*Controller.delete*(..))",
        returning = "result"
    )
    public void logDelete(JoinPoint joinPoint, Object result) {
        try {
            String className = joinPoint.getTarget().getClass().getSimpleName();
            String entityName = extractEntityName(className);
            
            // Get ID from method arguments
            Object[] args = joinPoint.getArgs();
            Long entityId = null;
            
            for (Object arg : args) {
                if (arg instanceof Long) {
                    entityId = (Long) arg;
                    break;
                } else if (arg instanceof Integer) {
                    entityId = ((Integer) arg).longValue();
                    break;
                }
            }
            
            if (entityId != null) {
                auditLogService.logAudit(entityName, entityId, "DELETE", 
                    String.format("Deleted %s with ID %d", entityName, entityId));
                logger.info("Audit logged: DELETE {} with ID {}", entityName, entityId);
            }
        } catch (Exception e) {
            logger.error("Failed to log DELETE audit: {}", e.getMessage());
        }
    }

    /**
     * Extract entity name from controller class name
     */
    private String extractEntityName(String className) {
        // Remove "Controller" suffix
        String name = className.replace("Controller", "");
        // Convert from PascalCase to readable format
        return name.replaceAll("([A-Z])", " $1").trim();
    }

    /**
     * Extract entity ID from response
     */
    private Long extractEntityId(Object result) {
        try {
            if (result instanceof ResponseEntity) {
                ResponseEntity<?> response = (ResponseEntity<?>) result;
                Object body = response.getBody();
                
                if (body != null) {
                    // Try to get ID using reflection
                    try {
                        var dataField = body.getClass().getDeclaredField("data");
                        dataField.setAccessible(true);
                        Object data = dataField.get(body);
                        
                        if (data != null) {
                            var idField = data.getClass().getDeclaredField("id");
                            idField.setAccessible(true);
                            Object id = idField.get(data);
                            
                            if (id instanceof Long) {
                                return (Long) id;
                            } else if (id instanceof Integer) {
                                return ((Integer) id).longValue();
                            }
                        }
                    } catch (NoSuchFieldException e) {
                        // Field not found, try alternative approach
                    }
                }
            }
        } catch (Exception e) {
            logger.debug("Could not extract entity ID: {}", e.getMessage());
        }
        return null;
    }
}
