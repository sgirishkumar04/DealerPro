package com.kia.dms.modules.auth.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendOtpEmail(String to, String otp) {
        System.out.println("DEBUG: Attempting to send OTP email to: " + to);
        try {
            jakarta.mail.internet.MimeMessage message = mailSender.createMimeMessage();
            org.springframework.mail.javamail.MimeMessageHelper helper = new org.springframework.mail.javamail.MimeMessageHelper(message, true);
            
            helper.setTo(to);
            helper.setSubject("Your DealerPro Verification Code");
            helper.setText("<h3>Welcome to DealerPro!</h3>" +
                    "<p>Your verification code is: <b style='font-size: 20px; color: #C8102E;'>" + otp + "</b></p>" +
                    "<p>This code will expire in 5 minutes.</p>", true);
            
            mailSender.send(message);
            System.out.println("DEBUG: OTP email sent successfully to: " + to);
        } catch (Exception e) {
            System.err.println("CRITICAL ERROR: Failed to send OTP email to " + to + ". Error: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    public void sendForgotPasswordOtp(String to, String otp) {
        System.out.println("DEBUG: Attempting to send Forgot Password email to: " + to);
        try {
            jakarta.mail.internet.MimeMessage message = mailSender.createMimeMessage();
            org.springframework.mail.javamail.MimeMessageHelper helper = new org.springframework.mail.javamail.MimeMessageHelper(message, true);
            
            helper.setTo(to);
            helper.setSubject("DealerPro Password Reset Request");
            helper.setText("<h3>Password Reset Request</h3>" +
                    "<p>You requested a password reset. Your OTP is: <b style='font-size: 20px; color: #C8102E;'>" + otp + "</b></p>" +
                    "<p>This code will expire in 5 minutes.</p>", true);
            
            mailSender.send(message);
            System.out.println("DEBUG: Forgot Password email sent successfully to: " + to);
        } catch (Exception e) {
            System.err.println("CRITICAL ERROR: Failed to send Forgot Password email to " + to + ". Error: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
