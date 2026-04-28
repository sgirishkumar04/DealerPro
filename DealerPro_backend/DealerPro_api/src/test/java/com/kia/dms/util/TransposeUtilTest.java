package com.kia.dms.util;

import com.kia.dms.common.utils.TransposeUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for TransposeUtil — the generic row-to-column transposition utility.
 * Target coverage: 100%. This utility is shared across Sales, Leads, Inventory, and Finance.
 * A bug here would affect all 4 modules simultaneously.
 */
@DisplayName("TransposeUtil — Generic Transpose Logic Tests")
class TransposeUtilTest {

    // ─────────────────────────────────────────────────────────────────────────
    // CORE TRANSPOSE TESTS
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Single row input is correctly transposed — basic happy path")
    void transpose_shouldCorrectlyPivot_singleRowInput() {
        // Simulate: [{ name: "Jan", sales: 50, revenue: 5000000 }]
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("name", "Jan");
        row.put("sales", 50);
        row.put("revenue", 5000000);

        Map<String, Object> result = TransposeUtil.transpose(
            List.of(row),
            List.of("sales", "revenue"),
            "name"
        );

        assertTrue(result.containsKey("Jan"), "Jan must be a column key in the transposed result");
        assertTrue(result.containsKey("metrics"), "Output must always contain 'metrics' key");

        List<Object> janValues = (List<Object>) result.get("Jan");
        assertEquals(2, janValues.size(), "Jan column must have 2 values: sales and revenue");
        assertEquals(50, janValues.get(0));       // Sales
        assertEquals(5000000, janValues.get(1));  // Revenue
    }

    @Test
    @DisplayName("Multiple row input creates one column per row — key field becomes column header")
    void transpose_shouldCreateOneColumnPerRow_usingKeyFieldAsHeader() {
        List<Map<String, Object>> rows = List.of(
            Map.of("month", "Jan", "sales", 50, "revenue", 5_000_000),
            Map.of("month", "Feb", "sales", 65, "revenue", 6_500_000),
            Map.of("month", "Mar", "sales", 80, "revenue", 8_000_000)
        );

        Map<String, Object> result = TransposeUtil.transpose(rows, List.of("sales", "revenue"), "month");

        // Each month becomes a column
        assertTrue(result.containsKey("Jan"));
        assertTrue(result.containsKey("Feb"));
        assertTrue(result.containsKey("Mar"));

        // Values are indexed by metric order
        List<Object> febValues = (List<Object>) result.get("Feb");
        assertEquals(65, febValues.get(0));        // Sales for Feb
        assertEquals(6_500_000, febValues.get(1)); // Revenue for Feb
    }

    @Test
    @DisplayName("Metrics list is always present in result with correct order")
    void transpose_shouldAlwaysIncludeMetrics_inCorrectOrder() {
        List<Map<String, Object>> rows = List.of(
            Map.of("quarter", "Q1", "income", 10000, "expenses", 7000, "profit", 3000)
        );

        Map<String, Object> result = TransposeUtil.transpose(
            rows,
            List.of("income", "expenses", "profit"), // Order matters
            "quarter"
        );

        List<Object> metrics = (List<Object>) result.get("metrics");
        assertEquals(3, metrics.size());
        assertEquals("income", metrics.get(0));
        assertEquals("expenses", metrics.get(1));
        assertEquals("profit", metrics.get(2));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EDGE CASES
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Empty input list returns result with only 'metrics' key — no crash")
    void transpose_shouldReturnOnlyMetricsKey_whenInputIsEmpty() {
        Map<String, Object> result = TransposeUtil.transpose(
            List.of(),
            List.of("sales", "revenue"),
            "name"
        );

        assertNotNull(result, "Result must never be null for empty input");
        assertTrue(result.containsKey("metrics"), "Metrics must always be present");

        // No data columns should exist
        assertFalse(result.containsKey("Jan"));
        assertFalse(result.containsKey("Q1"));
    }

    @Test
    @DisplayName("Row with null keyField value is stored under 'Unknown' column")
    void transpose_shouldUseUnknown_whenKeyFieldValueIsNull() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("name", null); // Null key field
        row.put("sales", 10);
        row.put("revenue", 1000);

        Map<String, Object> result = TransposeUtil.transpose(
            List.of(row),
            List.of("sales", "revenue"),
            "name"
        );

        assertTrue(result.containsKey("Unknown"),
            "Null key field must map to 'Unknown' column — not crash");
    }

    @Test
    @DisplayName("Metric not present in a row returns null for that cell — no crash")
    void transpose_shouldReturnNull_whenMetricIsMissingInRow() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("month", "Apr");
        row.put("sales", 100);
        // "revenue" is missing from this row

        Map<String, Object> result = TransposeUtil.transpose(
            List.of(row),
            List.of("sales", "revenue"),
            "month"
        );

        List<Object> aprValues = (List<Object>) result.get("Apr");
        assertEquals(100, aprValues.get(0));    // sales found
        assertNull(aprValues.get(1),            // revenue is null — not an exception
            "Missing metric must return null, not throw an exception");
    }

    @Test
    @DisplayName("Single metric in list transposes correctly")
    void transpose_shouldWork_withSingleMetric() {
        List<Map<String, Object>> rows = List.of(
            Map.of("status", "Available", "count", 15),
            Map.of("status", "Reserved",  "count", 5)
        );

        Map<String, Object> result = TransposeUtil.transpose(rows, List.of("count"), "status");

        assertTrue(result.containsKey("Available"));
        assertTrue(result.containsKey("Reserved"));
        assertEquals(15, ((List<Object>) result.get("Available")).get(0));
        assertEquals(5,  ((List<Object>) result.get("Reserved")).get(0));
    }

    @Test
    @DisplayName("Transposing Finance P&L data produces correct Income/Expenses/Profit mapping")
    void transpose_shouldCorrectlyMapFinancePnLData() {
        // Simulate what FinanceServiceImpl feeds into TransposeUtil
        List<Map<String, Object>> rows = List.of(
            new LinkedHashMap<>() {{
                put("snapshot", "Current Finance");
                put("revenue", BigDecimal.valueOf(500_000));
                put("expenses", BigDecimal.valueOf(300_000));
                put("profit", BigDecimal.valueOf(200_000));
            }}
        );

        Map<String, Object> result = TransposeUtil.transpose(
            rows,
            List.of("revenue", "expenses", "profit"),
            "snapshot"
        );

        assertTrue(result.containsKey("Current Finance"));
        List<Object> values = (List<Object>) result.get("Current Finance");
        assertEquals(BigDecimal.valueOf(500_000), values.get(0)); // Revenue
        assertEquals(BigDecimal.valueOf(300_000), values.get(1)); // Expenses
        assertEquals(BigDecimal.valueOf(200_000), values.get(2)); // Profit
    }

    @Test
    @DisplayName("Result does not contain any key that was not in input rows")
    void transpose_shouldNotAddExtraKeys_beyondInputData() {
        Map<String, Object> row = Map.of("month", "Oct", "sales", 30);

        Map<String, Object> result = TransposeUtil.transpose(
            List.of(row),
            List.of("sales"),
            "month"
        );

        Set<String> allowedKeys = Set.of("Oct", "metrics");
        for (String key : result.keySet()) {
            assertTrue(allowedKeys.contains(key),
                "Unexpected key '" + key + "' found in transpose output");
        }
    }
}
