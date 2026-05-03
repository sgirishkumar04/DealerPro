package com.kia.dms.common.utils;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Component
public class EncryptionUtil {

    private static String SECRET_KEY = "DefaultKey123456";

    @Value("${app.security.encryption-key:DefaultKey123456}")
    public void setSecretKey(String key) {
        // Ensure the key is exactly 16, 24, or 32 bytes for AES
        if (key.length() < 16) {
            SECRET_KEY = String.format("%-16s", key).substring(0, 16);
        } else if (key.length() < 24) {
            SECRET_KEY = key.substring(0, 16);
        } else if (key.length() < 32) {
            SECRET_KEY = key.substring(0, 24);
        } else {
            SECRET_KEY = key.substring(0, 32);
        }
    }

    public static String encrypt(String strToEncrypt) {
        if (strToEncrypt == null || strToEncrypt.isEmpty()) return strToEncrypt;
        try {
            SecretKeySpec secretKey = new SecretKeySpec(SECRET_KEY.getBytes(StandardCharsets.UTF_8), "AES");
            Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKey);
            return Base64.getEncoder().encodeToString(cipher.doFinal(strToEncrypt.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            return strToEncrypt;
        }
    }

    public static String decrypt(String strToDecrypt) {
        if (strToDecrypt == null || strToDecrypt.isEmpty()) return strToDecrypt;
        try {
            SecretKeySpec secretKey = new SecretKeySpec(SECRET_KEY.getBytes(StandardCharsets.UTF_8), "AES");
            Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
            cipher.init(Cipher.DECRYPT_MODE, secretKey);
            return new String(cipher.doFinal(Base64.getDecoder().decode(strToDecrypt)));
        } catch (Exception e) {
            return strToDecrypt;
        }
    }
}
