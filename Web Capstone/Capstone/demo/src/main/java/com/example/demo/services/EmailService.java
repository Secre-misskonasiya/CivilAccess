package com.example.demo.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendOTP(String toEmail, String otp, String fullname) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setTo(toEmail);
            helper.setSubject("Barangay San Sebastian System – Security Verification Code");
            
            String htmlContent = getOtpHtml(fullname, otp);
            helper.setText(htmlContent, true);
            
            mailSender.send(message);
        } catch (MessagingException e) {
            // Fallback to plain text
            sendPlainTextOTP(toEmail, otp, fullname);
        }
    }
    
    public void sendGeneratedPassword(String toEmail, String password, String fullname) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setTo(toEmail);
            helper.setSubject("Barangay San Sebastian System – Account Credentials");
            
            String htmlContent = getPasswordHtml(fullname, toEmail, password);
            helper.setText(htmlContent, true);
            
            mailSender.send(message);
        } catch (MessagingException e) {
            sendPlainTextPassword(toEmail, password, fullname);
        }
    }
    
    public void sendTestAlert(String toEmail, String adminName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setTo(toEmail);
            helper.setSubject("Barangay San Sebastian – TEST Emergency Alert");
            
            String htmlContent = getTestAlertHtml(adminName);
            helper.setText(htmlContent, true);
            
            mailSender.send(message);
        } catch (MessagingException e) {
            sendPlainTextTestAlert(toEmail, adminName);
        }
    }
    
    // ============================================
    // HTML TEMPLATES
    // ============================================
    
    private String getOtpHtml(String fullname, String otp) {
        return "<!DOCTYPE html>" +
            "<html>" +
            "<head>" +
            "<meta charset='UTF-8'>" +
            "<style>" +
            "body { font-family: 'DM Sans', Arial, sans-serif; margin: 0; padding: 20px; }" +
            ".container { max-width: 550px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 30px; border: 1px solid #e0e0e0; }" +
            "h2 { color: #386660; font-size: 24px; margin-bottom: 20px; }" +
            ".otp-box { background: #f4c542; padding: 25px; text-align: center; border-radius: 12px; margin: 25px 0; }" +
            ".otp-code { font-size: 48px; font-weight: bold; letter-spacing: 8px; color: #386660; font-family: monospace; }" +
            ".warning { color: #666; font-size: 13px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }" +
            "</style>" +
            "</head>" +
            "<body>" +
            "<div class='container'>" +
            "<h2>Confirm your Action</h2>" +
            "<p>Dear " + fullname + ",</p>" +
            "<p>Good day.</p>" +
            "<p>A request has been made to update an Employee account in the " +
            "Barangay San Sebastian Digitalized System. To proceed with this action, " +
            "please use the One-Time Password (OTP) provided below:</p>" +
            "<div class='otp-box'>" +
            "<div class='otp-code'>" + otp + "</div>" +
            "</div>" +
            "<p>For security reasons, please do not share this code with anyone. " +
            "Enter this code in the system to complete the verification process.</p>" +
            "<p>If you did not request this action, please disregard this email or " +
            "contact the Barangay San Sebastian office immediately.</p>" +
            "<p>Thank you.</p>" +
            "<p>Sincerely,<br>Barangay San Sebastian<br>System Administration</p>" +
            "<div class='warning'>⚠️ This code expires in 10 minutes.</div>" +
            "</div>" +
            "</body>" +
            "</html>";
    }
    
    private String getPasswordHtml(String fullname, String email, String password) {
        return "<!DOCTYPE html>" +
            "<html>" +
            "<head>" +
            "<meta charset='UTF-8'>" +
            "<style>" +
            "body { font-family: 'DM Sans', Arial, sans-serif; margin: 0; padding: 20px; }" +
            ".container { max-width: 550px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 30px; border: 1px solid #e0e0e0; }" +
            "h2 { color: #386660; font-size: 24px; margin-bottom: 20px; }" +
            ".credentials-box { background: #f4f4f4; padding: 20px; border-radius: 12px; margin: 20px 0; }" +
            ".label { font-weight: bold; color: #386660; }" +
            "</style>" +
            "</head>" +
            "<body>" +
            "<div class='container'>" +
            "<h2>Account Credentials</h2>" +
            "<p>Dear " + fullname + ",</p>" +
            "<p>Good day.</p>" +
            "<p>An account has been successfully created for you in the " +
            "Barangay San Sebastian Digitalized System. Below are your " +
            "temporary login credentials:</p>" +
            "<div class='credentials-box'>" +
            "<p><span class='label'>Email Address:</span> " + email + "</p>" +
            "<p><span class='label'>Temporary Password:</span> " + password + "</p>" +
            "</div>" +
            "<p>For security purposes, please log in to the system and change " +
            "your password immediately after your first login.</p>" +
            "<p>If you believe you received this message in error or you did not " +
            "request an account, please contact the Barangay San Sebastian " +
            "office immediately.</p>" +
            "<p>Thank you.</p>" +
            "<p>Sincerely,<br>Barangay San Sebastian<br>System Administration</p>" +
            "</div>" +
            "</body>" +
            "</html>";
    }
    
    private String getTestAlertHtml(String adminName) {
        return "<!DOCTYPE html>" +
            "<html>" +
            "<head>" +
            "<meta charset='UTF-8'>" +
            "<style>" +
            "body { font-family: 'DM Sans', Arial, sans-serif; margin: 0; padding: 20px; }" +
            ".container { max-width: 550px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 30px; border: 1px solid #e0e0e0; }" +
            "h2 { color: #386660; font-size: 24px; }" +
            ".alert-box { background: #fff8e7; border-left: 4px solid #f4c542; padding: 15px; margin: 20px 0; }" +
            "</style>" +
            "</head>" +
            "<body>" +
            "<div class='container'>" +
            "<h2>TEST Emergency Alert</h2>" +
            "<p>Dear " + adminName + ",</p>" +
            "<div class='alert-box'>" +
            "<p>This is a TEST emergency alert sent from the Barangay San Sebastian " +
            "Digitalized System to verify that the emergency notification system " +
            "is functioning correctly.</p>" +
            "</div>" +
            "<p>No action is required. If you received this message, the system is " +
            "working as expected.</p>" +
            "<p>If you did not expect this message, please contact the system administrator.</p>" +
            "<p>Sincerely,<br>Barangay San Sebastian<br>System Administration</p>" +
            "</div>" +
            "</body>" +
            "</html>";
    }
    
    // ============================================
    // FALLBACK PLAIN TEXT METHODS
    // ============================================
    
    private void sendPlainTextOTP(String toEmail, String otp, String fullname) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Barangay San Sebastian System – Security Verification Code");
        message.setText(
            "Dear " + fullname + ",\n\n" +
            "Good day.\n\n" +
            "A request has been made to update an Employee account in the " +
            "Barangay San Sebastian Digitalized System. To proceed with this action, " +
            "please use the One-Time Password (OTP) provided below:\n\n" +
            "      " + otp + "\n\n" +
            "For security reasons, please do not share this code with anyone. " +
            "Enter this code in the system to complete the verification process.\n\n" +
            "If you did not request this action, please disregard this email or " +
            "contact the Barangay San Sebastian office immediately.\n\n" +
            "Thank you.\n\n" +
            "Sincerely,\n" +
            "Barangay San Sebastian\n" +
            "System Administration"
        );
        mailSender.send(message);
    }
    
    private void sendPlainTextPassword(String toEmail, String password, String fullname) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Barangay San Sebastian System – Account Credentials");
        message.setText(
            "Dear " + fullname + ",\n\n" +
            "Good day.\n\n" +
            "An account has been successfully created for you in the " +
            "Barangay San Sebastian Digitalized System. Below are your " +
            "temporary login credentials:\n\n" +
            "Email Address: " + toEmail + "\n" +
            "Temporary Password: " + password + "\n\n" +
            "For security purposes, please log in to the system and change " +
            "your password immediately after your first login.\n\n" +
            "If you believe you received this message in error or you did not " +
            "request an account, please contact the Barangay San Sebastian " +
            "office immediately.\n\n" +
            "Thank you.\n\n" +
            "Sincerely,\n" +
            "Barangay San Sebastian\n" +
            "System Administration"
        );
        mailSender.send(message);
    }
    
    private void sendPlainTextTestAlert(String toEmail, String adminName) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Barangay San Sebastian – TEST Emergency Alert");
        message.setText(
            "Dear " + adminName + ",\n\n" +
            "This is a TEST emergency alert sent from the Barangay San Sebastian " +
            "Digitalized System to verify that the emergency notification system " +
            "is functioning correctly.\n\n" +
            "No action is required. If you received this message, the system is " +
            "working as expected.\n\n" +
            "If you did not expect this message, please contact the system administrator.\n\n" +
            "Sincerely,\n" +
            "Barangay San Sebastian\n" +
            "System Administration"
        );
        mailSender.send(message);
    }
}