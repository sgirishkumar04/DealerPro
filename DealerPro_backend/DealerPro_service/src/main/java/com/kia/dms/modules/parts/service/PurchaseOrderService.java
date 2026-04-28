package com.kia.dms.modules.parts.service;

import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.parts.dto.request.PurchaseOrderRequest;
import com.kia.dms.modules.parts.dto.response.PurchaseOrderResponse;
import org.springframework.data.domain.Pageable;

public interface PurchaseOrderService {
    PaginationResponse<PurchaseOrderResponse> getAllPurchaseOrders(Pageable pageable);
    PurchaseOrderResponse createPurchaseOrder(PurchaseOrderRequest request);
}
