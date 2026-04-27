package com.kia.dms.modules.sales.service;

import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.sales.dto.request.OrderRequest;
import com.kia.dms.modules.sales.dto.response.OrderResponse;
import org.springframework.data.domain.Pageable;

public interface OrderService {
    PaginationResponse<OrderResponse> getOrders(Long orderId, Long dealerId, Long managerId, Pageable pageable);
    OrderResponse createOrder(OrderRequest request);
    OrderResponse updateOrderStatus(Long id, String status, Long version);
    void deleteOrder(Long id);
    PaginationResponse<OrderResponse> searchOrders(com.kia.dms.common.dto.request.GlobalSearchRequest request);
}
