package com.kong.oc.common.exception;

import lombok.Getter;

@Getter
public class TokenException extends RuntimeException{
    private final TokenErrorType errorType;

    public TokenException(String message, TokenErrorType errorType) {
        super(message);
        this.errorType = errorType;
    }
}
