package com.kia.dms.modules.service.service;

import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.service.dto.request.ServiceOrderRequest;
import com.kia.dms.modules.service.dto.response.ServiceOrderResponse;
import org.springframework.data.domain.Pageable;

public interface ServiceOrderService {
    PaginationResponse<ServiceOrderResponse> getServiceOrders(Pageable pageable);
    ServiceOrderResponse createServiceOrder(ServiceOrderRequest request);
    ServiceOrderResponse updateServiceStatus(Long id, String status, Long version);
    PaginationResponse<ServiceOrderResponse> searchServiceOrders(com.kia.dms.common.dto.request.GlobalSearchRequest request);
    byte[] generateServiceReport(Long id);
}
