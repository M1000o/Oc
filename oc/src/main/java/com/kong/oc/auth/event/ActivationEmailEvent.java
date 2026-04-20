package com.kong.oc.auth.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class ActivationEmailEvent extends ApplicationEvent {
    private final Long userId;
    private final String email;
    private final String activationToken;
    private final String username;

    public ActivationEmailEvent(Object source, Long userId, String email, String activationToken, String username) {
        super(source);
        this.userId = userId;
        this.email = email;
        this.activationToken = activationToken;
        this.username = username;
    }
}
