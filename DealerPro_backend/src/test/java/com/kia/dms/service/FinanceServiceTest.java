package com.kia.dms.service;

import com.kia.dms.modules.dealer.entity.DealerEntity;
import com.kia.dms.modules.finance.entity.TransactionEntity;
import com.kia.dms.modules.finance.repository.TransactionRepository;
import com.kia.dms.modules.finance.service.impl.FinanceServiceImpl;
import com.kia.dms.modules.user.entity.RoleEntity;
import com.kia.dms.modules.user.entity.UserEntity;
import com.kia.dms.modules.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for FinanceServiceImpl's Quarterly P&L Transpose feature.
 * Tests the business logic pipeline: raw transactions → quarterly grouping → transpose.
 * No real database is used — all data is constructed in memory.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Finance Service — P&L Transpose Tests")
class FinanceServiceTest {

    @Mock private TransactionRepository transactionRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private FinanceServiceImpl financeService;

    private UserEntity adminUser;

    @BeforeEach
    void setUp() {
        // Set up a mock SecurityContext so getCurrentUser() works
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("admin@kia.com");
        SecurityContext secCtx = mock(SecurityContext.class);
        when(secCtx.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(secCtx);

        RoleEntity adminRole = new RoleEntity();
        adminRole.setName("ROLE_ADMIN");

        adminUser = new UserEntity();
        adminUser.setId(1L);
        adminUser.setEmail("admin@kia.com");
        adminUser.setRole(adminRole);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // QUARTERLY GROUPING TESTS
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Transactions in Jan/Feb/Mar are grouped into Q1")
    void getTransposedData_shouldGroupQ1Transactions_forJanFebMar() {
        when(userRepository.findByEmailWithRole("admin@kia.com")).thenReturn(Optional.of(adminUser));

        List<TransactionEntity> transactions = List.of(
            buildTransaction("CREDIT", 1000, LocalDateTime.of(2025, 1, 15, 0, 0)),  // Jan → Q1
            buildTransaction("CREDIT", 2000, LocalDateTime.of(2025, 2, 10, 0, 0)),  // Feb → Q1
            buildTransaction("DEBIT",  500,  LocalDateTime.of(2025, 3, 20, 0, 0))   // Mar → Q1
        );
        when(transactionRepository.findAll()).thenReturn(transactions);

        Map<String, Object> result = financeService.getTransposedData();

        assertNotNull(result);
        List<String> quarters = (List<String>) result.get("quarters");
        assertTrue(quarters.contains("Q1"), "Q1 must appear when transactions exist in Jan/Feb/Mar");
        assertEquals(1, quarters.size(), "Only Q1 should be present");

        Map<String, List<BigDecimal>> data = (Map<String, List<BigDecimal>>) result.get("data");
        // Q1 Income = 1000 + 2000 = 3000
        assertEquals(BigDecimal.valueOf(3000), data.get("Income").get(0));
        // Q1 Expenses = 500
        assertEquals(BigDecimal.valueOf(500), data.get("Expenses").get(0));
        // Q1 Profit = 3000 - 500 = 2500
        assertEquals(BigDecimal.valueOf(2500), data.get("Profit").get(0));
    }

    @Test
    @DisplayName("Transactions in Apr/May/Jun are grouped into Q2")
    void getTransposedData_shouldGroupQ2Transactions_forAprMayJun() {
        when(userRepository.findByEmailWithRole("admin@kia.com")).thenReturn(Optional.of(adminUser));

        List<TransactionEntity> transactions = List.of(
            buildTransaction("CREDIT", 5000, LocalDateTime.of(2025, 4, 1, 0, 0)),  // Apr → Q2
            buildTransaction("DEBIT",  2000, LocalDateTime.of(2025, 6, 30, 0, 0))  // Jun → Q2
        );
        when(transactionRepository.findAll()).thenReturn(transactions);

        Map<String, Object> result = financeService.getTransposedData();
        List<String> quarters = (List<String>) result.get("quarters");

        assertTrue(quarters.contains("Q2"));
        Map<String, List<BigDecimal>> data = (Map<String, List<BigDecimal>>) result.get("data");
        assertEquals(BigDecimal.valueOf(3000), data.get("Profit").get(quarters.indexOf("Q2")));
    }

    @Test
    @DisplayName("Transactions span multiple quarters — Q1 and Q4 both appear")
    void getTransposedData_shouldReturnMultipleQuarters_whenTransactionsSpanQ1AndQ4() {
        when(userRepository.findByEmailWithRole("admin@kia.com")).thenReturn(Optional.of(adminUser));

        List<TransactionEntity> transactions = List.of(
            buildTransaction("CREDIT", 10000, LocalDateTime.of(2025, 1, 15, 0, 0)), // Q1
            buildTransaction("DEBIT",  4000,  LocalDateTime.of(2025, 11, 20, 0, 0)) // Q4
        );
        when(transactionRepository.findAll()).thenReturn(transactions);

        Map<String, Object> result = financeService.getTransposedData();
        List<String> quarters = (List<String>) result.get("quarters");

        assertTrue(quarters.contains("Q1"), "Q1 must be present");
        assertTrue(quarters.contains("Q4"), "Q4 must be present");
        assertEquals(2, quarters.size());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INCOME / EXPENSE / PROFIT CALCULATION TESTS
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("CREDIT transactions are counted as Income")
    void getTransposedData_shouldCountCredit_asIncome() {
        when(userRepository.findByEmailWithRole("admin@kia.com")).thenReturn(Optional.of(adminUser));

        List<TransactionEntity> transactions = List.of(
            buildTransaction("CREDIT", 8000, LocalDateTime.of(2025, 7, 1, 0, 0)) // Q3
        );
        when(transactionRepository.findAll()).thenReturn(transactions);

        Map<String, Object> result = financeService.getTransposedData();
        Map<String, List<BigDecimal>> data = (Map<String, List<BigDecimal>>) result.get("data");

        assertEquals(BigDecimal.valueOf(8000), data.get("Income").get(0));
        assertEquals(BigDecimal.ZERO, data.get("Expenses").get(0));
        assertEquals(BigDecimal.valueOf(8000), data.get("Profit").get(0));
    }

    @Test
    @DisplayName("DEBIT transactions are counted as Expenses")
    void getTransposedData_shouldCountDebit_asExpenses() {
        when(userRepository.findByEmailWithRole("admin@kia.com")).thenReturn(Optional.of(adminUser));

        List<TransactionEntity> transactions = List.of(
            buildTransaction("DEBIT", 3000, LocalDateTime.of(2025, 10, 1, 0, 0)) // Q4
        );
        when(transactionRepository.findAll()).thenReturn(transactions);

        Map<String, Object> result = financeService.getTransposedData();
        Map<String, List<BigDecimal>> data = (Map<String, List<BigDecimal>>) result.get("data");

        assertEquals(BigDecimal.ZERO, data.get("Income").get(0));
        assertEquals(BigDecimal.valueOf(3000), data.get("Expenses").get(0));
        assertEquals(BigDecimal.valueOf(-3000), data.get("Profit").get(0));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NEGATIVE PROFIT (LOSS) TESTS
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Profit is negative when expenses exceed income (loss scenario)")
    void getTransposedData_shouldShowNegativeProfit_whenExpensesExceedIncome() {
        when(userRepository.findByEmailWithRole("admin@kia.com")).thenReturn(Optional.of(adminUser));

        List<TransactionEntity> transactions = List.of(
            buildTransaction("CREDIT", 1000, LocalDateTime.of(2025, 2, 1, 0, 0)),  // Q1 Income
            buildTransaction("DEBIT",  5000, LocalDateTime.of(2025, 2, 15, 0, 0))  // Q1 Expense (larger)
        );
        when(transactionRepository.findAll()).thenReturn(transactions);

        Map<String, Object> result = financeService.getTransposedData();
        Map<String, List<BigDecimal>> data = (Map<String, List<BigDecimal>>) result.get("data");

        BigDecimal profit = data.get("Profit").get(0);
        assertTrue(profit.compareTo(BigDecimal.ZERO) < 0,
            "Profit must be negative when expenses (5000) exceed income (1000)");
        assertEquals(BigDecimal.valueOf(-4000), profit);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EDGE CASES
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Empty transactions list returns empty data — no crash")
    void getTransposedData_shouldReturnEmptyResult_whenNoTransactionsExist() {
        when(userRepository.findByEmailWithRole("admin@kia.com")).thenReturn(Optional.of(adminUser));
        when(transactionRepository.findAll()).thenReturn(List.of());

        Map<String, Object> result = financeService.getTransposedData();

        assertNotNull(result, "Result must never be null even when no data exists");
        List<String> quarters = (List<String>) result.get("quarters");
        assertTrue(quarters.isEmpty(), "Quarters list must be empty when no transactions exist");
    }

    @Test
    @DisplayName("Transaction with null amount is safely skipped")
    void getTransposedData_shouldSkipTransaction_whenAmountIsNull() {
        when(userRepository.findByEmailWithRole("admin@kia.com")).thenReturn(Optional.of(adminUser));

        TransactionEntity badTx = buildTransaction("CREDIT", 0, LocalDateTime.of(2025, 1, 1, 0, 0));
        badTx.setAmount(null); // Null amount — must not crash

        List<TransactionEntity> transactions = List.of(
            badTx,
            buildTransaction("CREDIT", 500, LocalDateTime.of(2025, 1, 20, 0, 0))
        );
        when(transactionRepository.findAll()).thenReturn(transactions);

        assertDoesNotThrow(() -> financeService.getTransposedData());
    }

    @Test
    @DisplayName("Transpose output always contains 'quarters' and 'data' keys")
    void getTransposedData_shouldAlwaysReturnBothKeys_inOutput() {
        when(userRepository.findByEmailWithRole("admin@kia.com")).thenReturn(Optional.of(adminUser));
        when(transactionRepository.findAll()).thenReturn(List.of(
            buildTransaction("CREDIT", 100, LocalDateTime.of(2025, 5, 1, 0, 0))
        ));

        Map<String, Object> result = financeService.getTransposedData();

        assertTrue(result.containsKey("quarters"), "Response must always contain 'quarters' key");
        assertTrue(result.containsKey("data"), "Response must always contain 'data' key");
    }

    @Test
    @DisplayName("Quarters are sorted alphabetically (Q1 → Q2 → Q3 → Q4)")
    void getTransposedData_shouldReturnQuartersInOrder_Q1_to_Q4() {
        when(userRepository.findByEmailWithRole("admin@kia.com")).thenReturn(Optional.of(adminUser));

        List<TransactionEntity> transactions = List.of(
            buildTransaction("CREDIT", 100, LocalDateTime.of(2025, 10, 1, 0, 0)), // Q4 — added first
            buildTransaction("CREDIT", 200, LocalDateTime.of(2025, 1, 1, 0, 0)),  // Q1 — added second
            buildTransaction("CREDIT", 300, LocalDateTime.of(2025, 7, 1, 0, 0))   // Q3 — added third
        );
        when(transactionRepository.findAll()).thenReturn(transactions);

        Map<String, Object> result = financeService.getTransposedData();
        List<String> quarters = (List<String>) result.get("quarters");

        assertEquals("Q1", quarters.get(0), "Q1 must always come first");
        assertEquals("Q3", quarters.get(1), "Q3 must come second");
        assertEquals("Q4", quarters.get(2), "Q4 must come last");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER
    // ─────────────────────────────────────────────────────────────────────────

    private TransactionEntity buildTransaction(String type, long amount, LocalDateTime date) {
        DealerEntity dealer = new DealerEntity();
        dealer.setId(1L);

        TransactionEntity tx = new TransactionEntity();
        tx.setType(type);
        tx.setAmount(BigDecimal.valueOf(amount));
        tx.setDealer(dealer);
        // BaseEntity.createdAt is used for quarter grouping
        tx.setCreatedAt(date);
        return tx;
    }
}
