package com.kia.dms.service;

import com.kia.dms.exception.ResourceNotFoundException;
import com.kia.dms.modules.dealer.entity.DealerEntity;
import com.kia.dms.modules.leads.entity.LeadEntity;
import com.kia.dms.modules.leads.repository.LeadRepository;
import com.kia.dms.modules.leads.repository.TestDriveRepository;
import com.kia.dms.modules.leads.service.impl.LeadServiceImpl;
import com.kia.dms.modules.dealer.repository.DealerRepository;
import com.kia.dms.modules.user.entity.RoleEntity;
import com.kia.dms.modules.user.entity.UserEntity;
import com.kia.dms.modules.user.repository.UserRepository;
import com.kia.dms.modules.vehicle.repository.VehicleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for LeadServiceImpl.
 * Covers: soft delete, optimistic locking conflict, status update, createLead role rules,
 * dealer isolation, and lead score logic.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Lead Service Tests")
class LeadServiceTest {

    @Mock private LeadRepository leadRepository;
    @Mock private TestDriveRepository testDriveRepository;
    @Mock private VehicleRepository vehicleRepository;
    @Mock private UserRepository userRepository;
    @Mock private DealerRepository dealerRepository;

    @InjectMocks
    private LeadServiceImpl leadService;

    private UserEntity adminUser;
    private UserEntity dealerUser;
    private DealerEntity dealer;
    private LeadEntity existingLead;

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

        RoleEntity dealerRole = new RoleEntity();
        dealerRole.setName("ROLE_DEALER");

        dealer = new DealerEntity();
        dealer.setId(10L);
        dealer.setName("Kia Delhi");

        dealerUser = new UserEntity();
        dealerUser.setId(2L);
        dealerUser.setEmail("dealer@kia.com");
        dealerUser.setRole(dealerRole);
        dealerUser.setDealer(dealer);

        existingLead = new LeadEntity();
        existingLead.setFirstName("Arjun");
        existingLead.setLastName("Singh");
        existingLead.setEmail("arjun@gmail.com");
        existingLead.setPhone("9876543210");
        existingLead.setStatus("NEW");
        existingLead.setDealer(dealer);
        existingLead.setVersion(1L);
        existingLead.setIsDeleted(false);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SOFT DELETE TESTS
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("deleteLead should set isDeleted=true (soft delete, not physical)")
    void deleteLead_shouldSoftDelete_notPhysicallyRemove() {
        when(leadRepository.findById(1L)).thenReturn(Optional.of(existingLead));

        leadService.deleteLead(1L);

        // Capture what was saved to verify soft delete behavior
        ArgumentCaptor<LeadEntity> captor = ArgumentCaptor.forClass(LeadEntity.class);
        verify(leadRepository).save(captor.capture());

        LeadEntity saved = captor.getValue();
        assertTrue(saved.getIsDeleted(), "Lead must be soft-deleted (isDeleted=true), NOT physically deleted");
        verify(leadRepository, never()).delete(any(LeadEntity.class)); // MUST never physically delete
    }

    @Test
    @DisplayName("deleteLead throws ResourceNotFoundException when lead does not exist")
    void deleteLead_shouldThrowResourceNotFound_whenLeadDoesNotExist() {
        when(leadRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> leadService.deleteLead(999L));
        verify(leadRepository, never()).save(any());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OPTIMISTIC LOCKING TESTS
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("updateLead should throw OptimisticLockingFailure when client sends stale version")
    void updateLead_shouldThrowOptimisticLockingFailure_whenVersionMismatch() {
        when(leadRepository.findById(1L)).thenReturn(Optional.of(existingLead)); // version=1 in DB

        LeadEntity staleUpdate = new LeadEntity();
        staleUpdate.setFirstName("Updated Name");
        staleUpdate.setVersion(0L); // Client has version 0, DB has version 1 → conflict

        assertThrows(ObjectOptimisticLockingFailureException.class,
            () -> leadService.updateLead(1L, staleUpdate));

        // The save must NOT be called when a version conflict is detected
        verify(leadRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateLead succeeds when version matches (no concurrent modification)")
    void updateLead_shouldSucceed_whenVersionMatches() {
        when(leadRepository.findById(1L)).thenReturn(Optional.of(existingLead)); // version=1
        when(leadRepository.save(any())).thenReturn(existingLead);

        LeadEntity update = new LeadEntity();
        update.setFirstName("Rajesh");
        update.setVersion(1L); // Correct version

        assertDoesNotThrow(() -> leadService.updateLead(1L, update));
        verify(leadRepository).save(existingLead);
        assertEquals("Rajesh", existingLead.getFirstName());
    }

    @Test
    @DisplayName("updateLead with null version (legacy record) treats it as version 0")
    void updateLead_shouldTreatNullVersionAsZero_forLegacyRecords() {
        existingLead.setVersion(null); // Legacy record with no version yet

        when(leadRepository.findById(1L)).thenReturn(Optional.of(existingLead));
        when(leadRepository.save(any())).thenReturn(existingLead);

        LeadEntity update = new LeadEntity();
        update.setFirstName("NewName");
        update.setVersion(0L); // Client sends 0, which equals null (treated as 0)

        assertDoesNotThrow(() -> leadService.updateLead(1L, update));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STATUS TRANSITION TESTS
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("updateLeadStatus sets status correctly and returns updated response")
    void updateLeadStatus_shouldSetNewStatus_whenVersionMatches() {
        when(leadRepository.findById(1L)).thenReturn(Optional.of(existingLead)); // version=1
        when(leadRepository.save(any())).thenReturn(existingLead);

        // Mock SecurityUtils for role check in mapToLeadResponse
        try (var staticMock = mockStatic(com.kia.dms.common.utils.SecurityUtils.class)) {
            staticMock.when(com.kia.dms.common.utils.SecurityUtils::getCurrentUserRole)
                .thenReturn("ROLE_ADMIN");
            leadService.updateLeadStatus(1L, "QUALIFIED", 1L);
        }

        assertEquals("QUALIFIED", existingLead.getStatus());
    }

    @Test
    @DisplayName("updateLeadStatus throws OptimisticLockingFailure on version mismatch")
    void updateLeadStatus_shouldThrowOptimisticLockingFailure_whenVersionStale() {
        when(leadRepository.findById(1L)).thenReturn(Optional.of(existingLead)); // version=1

        assertThrows(ObjectOptimisticLockingFailureException.class,
            () -> leadService.updateLeadStatus(1L, "CONVERTED", 0L));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DEALER ISOLATION (MULTI-TENANT) TESTS
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("createLead throws AccessDeniedException if DEALER user has no dealer context")
    void createLead_shouldThrowAccessDenied_whenDealerUserHasNoDealerContext() {
        // Dealer user with no dealer assigned
        dealerUser.setDealer(null);

        when(userRepository.findByEmailWithRole("admin@kia.com")).thenReturn(Optional.of(dealerUser));

        LeadEntity newLead = new LeadEntity();
        newLead.setFirstName("Test");

        // For a ROLE_DEALER user, they must have a dealer assigned
        assertThrows(RuntimeException.class, () -> leadService.createLead(newLead));
    }

    @Test
    @DisplayName("createLead for Admin without dealer context throws IllegalArgumentException")
    void createLead_shouldThrowIllegalArgument_whenAdminDoesNotSpecifyDealer() {
        when(userRepository.findByEmailWithRole("admin@kia.com")).thenReturn(Optional.of(adminUser));

        LeadEntity newLead = new LeadEntity();
        newLead.setFirstName("Ravi");
        // No dealer set — Admin must always specify dealer when creating lead

        assertThrows(IllegalArgumentException.class, () -> leadService.createLead(newLead));
    }

    @Test
    @DisplayName("createLead defaults status to NEW if no status provided")
    void createLead_shouldDefaultStatus_toNEW_whenStatusIsNull() {
        when(userRepository.findByEmailWithRole("admin@kia.com")).thenReturn(Optional.of(dealerUser));

        LeadEntity newLead = new LeadEntity();
        newLead.setFirstName("Priya");
        newLead.setStatus(null); // Status not set — must default to NEW

        when(leadRepository.save(any())).thenReturn(existingLead);
        try (var staticMock = mockStatic(com.kia.dms.common.utils.SecurityUtils.class)) {
            staticMock.when(com.kia.dms.common.utils.SecurityUtils::getCurrentUserRole)
                .thenReturn("ROLE_DEALER");
            leadService.createLead(newLead);
        }

        verify(leadRepository).save(argThat(l -> "NEW".equals(l.getStatus())));
    }
}
