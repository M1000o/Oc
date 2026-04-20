package com.kong.oc.security.jwt;

import com.kong.oc.security.keys.RsaKeyProvider;
import com.nimbusds.jose.Algorithm;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import java.math.BigInteger;
import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateCrtKey;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.RSAPublicKeySpec;

@Configuration
public class JwtEncoderConfig {

    @Bean
    public JwtEncoder jwtEncoder(RsaKeyProvider keyProvider){
        try {
            RSAPrivateKey privateKey = keyProvider.getPrivateKey();

            // Derivar la clave pública desde la clave privada CRT
            RSAPublicKey publicKey;
            if (privateKey instanceof RSAPrivateCrtKey crtKey) {
                BigInteger modulus = crtKey.getModulus();
                BigInteger publicExponent = crtKey.getPublicExponent();
                RSAPublicKeySpec publicKeySpec = new RSAPublicKeySpec(modulus, publicExponent);
                KeyFactory keyFactory = KeyFactory.getInstance("RSA");
                publicKey = (RSAPublicKey) keyFactory.generatePublic(publicKeySpec);
            } else {
                throw new IllegalStateException("No se puede derivar la clave pública: la clave privada no es RSAPrivateCrtKey");
            }

            RSAKey rsaKey = new RSAKey.Builder(publicKey)
                    .privateKey(privateKey)
                    .algorithm(Algorithm.parse(SignatureAlgorithm.RS256.getName()))
                    .build();

            JWKSet jwkSet = new JWKSet(rsaKey);

            return new NimbusJwtEncoder(new ImmutableJWKSet<>(jwkSet));
        } catch (Exception e) {
            throw new IllegalStateException("Error creando JwtEncoder", e);
        }
    }

}
