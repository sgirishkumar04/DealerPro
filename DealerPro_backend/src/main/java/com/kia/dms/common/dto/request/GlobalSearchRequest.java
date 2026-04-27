package com.kia.dms.common.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GlobalSearchRequest {
    private String keyword;
    private List<FilterRequest> filters;
    private List<SortRequest> sorts;
    private int page = 0;
    private int size = 10;

    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }
    public List<FilterRequest> getFilters() { return filters; }
    public void setFilters(List<FilterRequest> filters) { this.filters = filters; }
    public List<SortRequest> getSorts() { return sorts; }
    public void setSorts(List<SortRequest> sorts) { this.sorts = sorts; }
    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }
    public int getSize() { return size; }
    public void setSize(int size) { this.size = size; }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FilterRequest {
        private String field;
        private String operator; // =, LIKE, >, <
        private String value;

        public String getField() { return field; }
        public void setField(String field) { this.field = field; }
        public String getOperator() { return operator; }
        public void setOperator(String operator) { this.operator = operator; }
        public String getValue() { return value; }
        public void setValue(String value) { this.value = value; }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SortRequest {
        private String field;
        private String direction; // ASC, DESC

        public String getField() { return field; }
        public void setField(String field) { this.field = field; }
        public String getDirection() { return direction; }
        public void setDirection(String direction) { this.direction = direction; }
    }
}
