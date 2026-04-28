package com.kia.dms.common.response;

public class ApiResponse<T> {
    private boolean success;
    private T data;
    private String message;

    public ApiResponse() {}

    public ApiResponse(boolean success, T data, String message) {
        this.success = success;
        this.data = data;
        this.message = message;
    }

    public ApiResponse(int status, String message, T data) {
        this.success = status >= 200 && status < 300;
        this.message = message;
        this.data = data;
    }

    public int getStatus() { return success ? 200 : 400; }
    public void setStatus(int status) { this.success = status >= 200 && status < 300; }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public T getData() { return data; }
    public void setData(T data) { this.data = data; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
