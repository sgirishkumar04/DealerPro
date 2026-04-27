package com.kia.dms.modules.parts.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class InsufficientPartsException extends RuntimeException {
    public InsufficientPartsException(String message) {
        super(message);
    }
}
