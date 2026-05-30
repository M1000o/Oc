package com.kong.oc.dto;

public enum Status implements Transitionable<Status> {
    
    BORRADOR {
        @Override
        public boolean canTransitionTo(Status next){
            return next ==  PENDIENTE || next == CANCELADO;
        }
    },
    PENDIENTE {
        @Override
        public boolean canTransitionTo(Status next) {
            return next == APROBADO || next == CANCELADO;
        }
    },
    APROBADO {
        @Override
        public boolean canTransitionTo(Status next) {
            return false;
        }
    },
    CANCELADO {
        @Override
        public boolean canTransitionTo(Status next) {
            return false;
        }
    },
    CERRADA {
        @Override
        public boolean canTransitionTo(Status next){
            return false;
        }
    };
}