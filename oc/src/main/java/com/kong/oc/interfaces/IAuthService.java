package com.kong.oc.interfaces;

import com.kong.oc.auth.dto.LoginRequest;
import com.kong.oc.auth.dto.RegisterRequest;
import com.kong.oc.auth.dto.TokenResponse;

public interface IAuthService {
    public TokenResponse login(LoginRequest request);
    public TokenResponse refresh(String refreshToken);
    public TokenResponse register(RegisterRequest request);
    public void logout(String refreshToken);
}
