package com.kia.dms.common.utils;

public class MaskingUtil {

    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        String[] parts = email.split("@");
        String name = parts[0];
        String domain = parts[1];
        if (name.length() <= 1) return "*@" + domain;
        return name.charAt(0) + "*****@" + domain;
    }

    public static String maskPhone(String phone) {
        if (phone == null || phone.length() < 4) return phone;
        return "******" + phone.substring(phone.length() - 4);
    }

    public static String maskName(String name) {
        if (name == null || name.length() <= 1) return name;
        return name.charAt(0) + "*****";
    }

    public static String maskAddress(String address) {
        if (address == null || address.length() < 5) return address;
        return address.substring(0, 5) + "**********";
    }
}
