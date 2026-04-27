package com.kia.dms.entity;

import com.kia.dms.modules.leads.entity.LeadEntity;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for LeadEntity's built-in lead scoring logic.
 * These are pure unit tests with zero dependencies — fastest tests in the suite.
 * Lead scoring is a calculated @Transient field based on status + completeness.
 */
@DisplayName("Lead Entity — Lead Score Logic Tests")
class LeadEntityTest {

    // ─────────────────────────────────────────────────────────────────────────
    // LEAD SCORE BY STATUS
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("NEW lead should have base score of 20")
    void getLeadScore_shouldReturn20_forNewLead() {
        LeadEntity lead = new LeadEntity();
        lead.setStatus("NEW");
        assertEquals(20, lead.getLeadScore());
    }

    @Test
    @DisplayName("CONTACTED lead should have base score of 50")
    void getLeadScore_shouldReturn50_forContactedLead() {
        LeadEntity lead = new LeadEntity();
        lead.setStatus("CONTACTED");
        assertEquals(50, lead.getLeadScore());
    }

    @Test
    @DisplayName("QUALIFIED lead should have base score of 80")
    void getLeadScore_shouldReturn80_forQualifiedLead() {
        LeadEntity lead = new LeadEntity();
        lead.setStatus("QUALIFIED");
        assertEquals(80, lead.getLeadScore());
    }

    @Test
    @DisplayName("CONVERTED lead should have maximum score of 100")
    void getLeadScore_shouldReturn100_forConvertedLead() {
        LeadEntity lead = new LeadEntity();
        lead.setStatus("CONVERTED");
        // CONVERTED has base 100 — adding bonuses still caps at 100
        assertTrue(lead.getLeadScore() <= 100);
        assertEquals(100, lead.getLeadScore()); // No bonuses can exceed cap
    }

    @Test
    @DisplayName("LOST lead should always return 0 regardless of other data")
    void getLeadScore_shouldReturnZero_forLostLead_regardlessOfOtherData() {
        LeadEntity lead = new LeadEntity();
        lead.setStatus("LOST");
        lead.setNotes("This is a long note with details about why lead was lost");
        lead.setVehicleInterest("Kia Seltos");
        // Even with notes and vehicle interest, LOST leads always return 0
        assertEquals(0, lead.getLeadScore());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BONUS SCORE TESTS
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Lead with notes longer than 10 chars gets +10 bonus score")
    void getLeadScore_shouldAdd10_whenNotesAreLongerThan10Chars() {
        LeadEntity lead = new LeadEntity();
        lead.setStatus("NEW"); // base = 20
        lead.setNotes("Customer is very interested in Seltos AWD"); // >10 chars

        // 20 (base) + 10 (notes bonus) = 30
        assertEquals(30, lead.getLeadScore());
    }

    @Test
    @DisplayName("Lead with vehicle interest gets +10 bonus score")
    void getLeadScore_shouldAdd10_whenVehicleInterestIsSet() {
        LeadEntity lead = new LeadEntity();
        lead.setStatus("NEW"); // base = 20
        lead.setVehicleInterest("Kia Carens");

        // 20 (base) + 10 (vehicle interest) = 30
        assertEquals(30, lead.getLeadScore());
    }

    @Test
    @DisplayName("Fully complete QUALIFIED lead gets both bonuses capped at 100")
    void getLeadScore_shouldCapAt100_forFullyQualifiedLead() {
        LeadEntity lead = new LeadEntity();
        lead.setStatus("QUALIFIED"); // base = 80
        lead.setNotes("Customer visited showroom twice, very interested");
        lead.setVehicleInterest("Kia Sonet");

        // 80 + 10 + 10 = 100, capped at 100
        assertEquals(100, lead.getLeadScore());
    }

    @Test
    @DisplayName("Score must never exceed 100 even with all bonuses")
    void getLeadScore_shouldNeverExceed100() {
        LeadEntity lead = new LeadEntity();
        lead.setStatus("CONVERTED"); // base = 100
        lead.setNotes("Very detailed notes about the converted customer");
        lead.setVehicleInterest("Kia EV6");

        // Without cap: 100 + 10 + 10 = 120; with cap = 100
        assertTrue(lead.getLeadScore() <= 100);
        assertEquals(100, lead.getLeadScore());
    }

    @Test
    @DisplayName("Notes shorter than or equal to 10 chars do NOT give bonus")
    void getLeadScore_shouldNotAddBonus_whenNotesAreTooShort() {
        LeadEntity lead = new LeadEntity();
        lead.setStatus("NEW"); // base = 20
        lead.setNotes("Short"); // <=10 chars — no bonus

        assertEquals(20, lead.getLeadScore());
    }

    @Test
    @DisplayName("Empty vehicle interest does NOT give bonus")
    void getLeadScore_shouldNotAddBonus_whenVehicleInterestIsEmpty() {
        LeadEntity lead = new LeadEntity();
        lead.setStatus("CONTACTED"); // base = 50
        lead.setVehicleInterest(""); // Empty string — no bonus

        assertEquals(50, lead.getLeadScore());
    }

    @Test
    @DisplayName("Null status should not crash — score defaults to 0")
    void getLeadScore_shouldHandleNullStatus_gracefully() {
        LeadEntity lead = new LeadEntity();
        lead.setStatus(null);
        // No status means no base score — just bonus checks which also return 0
        assertEquals(0, lead.getLeadScore());
    }

    @Test
    @DisplayName("Status comparison is case-insensitive (new vs NEW vs New)")
    void getLeadScore_shouldBeCaseInsensitive_forStatus() {
        LeadEntity lead = new LeadEntity();

        lead.setStatus("new");
        assertEquals(20, lead.getLeadScore());

        lead.setStatus("Contacted");
        assertEquals(50, lead.getLeadScore());

        lead.setStatus("QUALIFIED");
        assertEquals(80, lead.getLeadScore());
    }
}
