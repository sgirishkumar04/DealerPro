package com.kia.dms.config;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

@Converter(autoApply = false)
public class LocalDateTimeConverter implements AttributeConverter<LocalDateTime, String> {

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final DateTimeFormatter SQLITE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public String convertToDatabaseColumn(LocalDateTime localDateTime) {
        // Use SQLite format (space instead of T) to avoid JDBC parsing errors
        return localDateTime != null ? localDateTime.format(SQLITE_FORMATTER) : null;
    }

    @Override
    public LocalDateTime convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.trim().isEmpty()) {
            return null;
        }
        
        // Handle numeric millisecond timestamps
        if (dbData.matches("^\\d+$")) {
            try {
                long millis = Long.parseLong(dbData);
                return LocalDateTime.ofInstant(java.time.Instant.ofEpochMilli(millis), java.time.ZoneId.systemDefault());
            } catch (NumberFormatException ignored) {}
        }

        try {
            // Try ISO format first (standard)
            return LocalDateTime.parse(dbData, ISO_FORMATTER);
        } catch (DateTimeParseException e) {
            try {
                // If ISO fails, try the common SQLite format with a space
                String normalized = dbData.replace(" ", "T");
                return LocalDateTime.parse(normalized, ISO_FORMATTER);
            } catch (DateTimeParseException e2) {
                // Last ditch effort: try the expected SQLite pattern explicitly
                return LocalDateTime.parse(dbData, SQLITE_FORMATTER);
            }
        }
    }
}
