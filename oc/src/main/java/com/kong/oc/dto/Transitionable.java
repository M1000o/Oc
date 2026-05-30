package com.kong.oc.dto;

public interface Transitionable<T> {
    boolean canTransitionTo(T nextStatus);
}