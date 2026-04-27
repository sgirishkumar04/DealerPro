package com.kia.dms.modules.parts.service;

import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.parts.dto.request.PartRequest;
import com.kia.dms.modules.parts.dto.response.PartResponse;
import org.springframework.data.domain.Pageable;

public interface PartService {
    PaginationResponse<PartResponse> getAllParts(String name, String supplier, Pageable pageable);
    PartResponse getPartById(Long id);
    PartResponse createPart(PartRequest request);
    PartResponse updatePart(Long id, PartRequest request);
    void deletePart(Long id);
    PaginationResponse<PartResponse> searchParts(com.kia.dms.common.dto.request.GlobalSearchRequest request);
}
