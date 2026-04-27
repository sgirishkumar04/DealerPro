package com.kia.dms.modules.leads.service;

import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.leads.dto.request.TestDriveRequest;
import com.kia.dms.modules.leads.dto.response.LeadResponse;
import com.kia.dms.modules.leads.dto.response.TestDriveResponse;
import com.kia.dms.modules.leads.entity.LeadEntity;
import org.springframework.data.domain.Pageable;

public interface LeadService {
    PaginationResponse<LeadResponse> getLeads(Pageable pageable);
    LeadResponse createLead(LeadEntity lead);
    LeadResponse updateLeadStatus(Long id, String status, Long version);
    PaginationResponse<LeadResponse> searchLeads(com.kia.dms.common.dto.request.GlobalSearchRequest request);
    
    PaginationResponse<TestDriveResponse> getTestDrives(Pageable pageable);
    PaginationResponse<TestDriveResponse> searchTestDrives(com.kia.dms.common.dto.request.GlobalSearchRequest request);
    TestDriveResponse scheduleTestDrive(TestDriveRequest request);
    TestDriveResponse updateTestDrive(Long id, TestDriveRequest request);
    LeadResponse updateLead(Long id, LeadEntity lead);
    void deleteLead(Long id);
}
