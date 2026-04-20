package com.kong.oc.security.keys;

import lombok.Getter;
import org.springframework.stereotype.Component;

import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;

@Getter
@Component
public class RsaKeyProvider {

    private final RSAPrivateKey privateKey;

    public RsaKeyProvider(){
        try{
            this.privateKey = loadPrivateKey();
        }catch (Exception e){
            throw new IllegalStateException("Error cargando la clave privada RSA", e);
        }
    }

    private RSAPrivateKey loadPrivateKey() throws Exception {

        var inputStream = getClass()
                .getClassLoader()
                .getResourceAsStream("keys/private.key");

        if(inputStream == null){
            throw new IllegalStateException("No se encontró el archivo de clave privada RSA");
        }

        String key = new String(inputStream.readAllBytes());

        key = key
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s+", "");

        byte[] decodedkey = Base64.getDecoder().decode(key);

        PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(decodedkey);
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");

        return (RSAPrivateKey) keyFactory.generatePrivate(keySpec);
    }

}
