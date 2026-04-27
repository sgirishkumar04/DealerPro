package com.kia.dms.common.utils;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class TransposeUtil {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Generic utility to transpose a list of row-based data into column-based format.
     *
     * @param data      The list of row objects (can be DTOs or Maps).
     * @param metrics   The fields to extract as metrics (e.g., ["sales", "revenue"]).
     * @param keyField  The field to use as the column headers (e.g., "month").
     * @return Transposed map representation.
     */
    public static Map<String, Object> transpose(
            List<?> data,
            List<String> metrics,
            String keyField
    ) {
        Map<String, Object> result = new LinkedHashMap<>();
        
        // Convert input DTOs to Maps using Jackson for generic property access
        List<Map<String, Object>> mapList = objectMapper.convertValue(
                data, 
                new TypeReference<List<Map<String, Object>>>() {}
        );

        for (Map<String, Object> row : mapList) {
            Object keyObj = row.get(keyField);
            String key = (keyObj != null) ? keyObj.toString() : "Unknown";
            
            List<Object> values = new ArrayList<>();
            for (String metric : metrics) {
                values.add(row.get(metric));
            }
            
            result.put(key, values);
        }

        result.put("metrics", new ArrayList<>(metrics));
        return result;
    }
}
