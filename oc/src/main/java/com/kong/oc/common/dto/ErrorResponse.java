package com.kong.oc.common.dto;

import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class ErrorResponse {
    private final int status;
    private final String code;
    private final String message;
    private final LocalDateTime timestamp;

    public ErrorResponse(int status, String message, LocalDateTime timestamp) {
        this(status, null, message, timestamp);
    }

    public ErrorResponse(int status, String code, String message, LocalDateTime timestamp) {
        this.status = status;
        this.code = code;
        this.message = message;
        this.timestamp = timestamp;
    }
}
