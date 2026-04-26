package com.example.demo.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendOTP(String toEmail, String otp, String fullname) {
    SimpleMailMessage message = new SimpleMailMessage();
    message.setTo(toEmail);
    message.setSubject("Barangay San Sebastian System – Security Verification Code");

    message.setText(
        "Dear " + fullname +",\n\n" +

        "Good day.\n\n" +

        "A request has been made to update an Employee account in the " +
        "Barangay San Sebastian Digitalized System. To proceed with this action, " +
        "please use the One-Time Password (OTP) provided below:\n\n" +

        "Verification Code: " + otp + "\n\n" +

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
    public void sendGeneratedPassword(String toEmail, String password, String fullname) {
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
public void sendTestAlert(String toEmail, String adminName) {
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
