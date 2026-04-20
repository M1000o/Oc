package com.kong.oc.common.exception;

import lombok.Getter;

@Getter
public class BadRequestException extends RuntimeException{
    private final Object data;

    public BadRequestException(String message) {
        super(message);
        this.data = null;
    }

    public BadRequestException(String message, Object data) {
        super(message);
        this.data = data;
    }

}
