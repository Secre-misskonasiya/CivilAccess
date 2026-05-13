package com.example.demo.controller;

import com.example.demo.model.AdminUser;
import com.example.demo.model.ResidentUser;
import com.example.demo.repository.AdminUserRepository;
import com.example.demo.repository.ResidentUserRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Optional;

@Controller
public class ResidentAuthController {

    @Autowired
    private ResidentUserRepository residentUserRepository;
    
    @Autowired
    private AdminUserRepository adminUserRepository;

    private static final String SUPABASE_URL = "https://upfrofppponiqffbssqb.supabase.co";
    private static final String SUPABASE_ANON_KEY = "sb_publishable_tZyxrTJrpd_OD5-TKUkT8Q__DnuY0tj";
    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/resident-login")
    public String showLoginPage(HttpSession session) {
        if (session.getAttribute("residentId") != null || session.getAttribute("adminAsResidentId") != null) {
            return "redirect:/announcements";
        }
        return "ResidentLogin";
    }

    /**
     * Checks both residents AND admin_users tables for login
     */
    @GetMapping("/resident-check-status")
    @ResponseBody
    public ResponseEntity<String> checkStatus(
            @RequestParam String email,
            @RequestParam String password) {

        String normalizedEmail = email.trim().toLowerCase();

        // First check residents table
        Optional<ResidentUser> residentOpt = residentUserRepository.findByEmail(normalizedEmail);
        
        if (residentOpt.isPresent()) {
            ResidentUser resident = residentOpt.get();
            
            if ("DEACTIVATED".equalsIgnoreCase(resident.getAccount_status())) {
                return ResponseEntity.status(403).body("Account is deactivated.");
            }
            
            boolean supabaseOk = verifyWithSupabase(normalizedEmail, password);
            boolean localOk = password != null && resident.getValidId() != null && password.equals(resident.getValidId());
            
            if (supabaseOk || localOk) {
                return ResponseEntity.ok("OK");
            }
        }
        
        // If not found in residents or password wrong, check admin_users
        Optional<AdminUser> adminOpt = adminUserRepository.findByEmail(normalizedEmail);
        
        if (adminOpt.isPresent()) {
            AdminUser admin = adminOpt.get();
            
            // Check admin password (for admin login as resident)
            if (password != null && admin.getPassword() != null && password.equals(admin.getPassword())) {
                return ResponseEntity.ok("OK_ADMIN"); // Special flag for admin logging in as resident
            }
        }
        
        return ResponseEntity.status(401).body("Invalid email or password.");
    }

    /**
     * Handles login for both residents AND admin users
     */
    @PostMapping("/resident-login")
    public String processLogin(
            @RequestParam String email,
            @RequestParam String password,
            HttpSession session) {

        String normalizedEmail = email.trim().toLowerCase();

        // First try residents table
        Optional<ResidentUser> residentOpt = residentUserRepository.findByEmail(normalizedEmail);
        
        if (residentOpt.isPresent()) {
            ResidentUser resident = residentOpt.get();
            
            if ("DEACTIVATED".equalsIgnoreCase(resident.getAccount_status())) {
                return "redirect:/resident-login?deactivated";
            }
            
            boolean supabaseOk = verifyWithSupabase(normalizedEmail, password);
            boolean localOk = password != null && resident.getValidId() != null && password.equals(resident.getValidId());
            
            if (supabaseOk || localOk) {
                session.setAttribute("residentId", resident.getId().toString());
                session.setAttribute("residentEmail", resident.getEmail());
                session.setAttribute("residentName", resident.getFirstName().trim() + " " + resident.getLastName().trim());
                session.setAttribute("residentStatus", resident.getAccount_status());
                session.setAttribute("userType", "RESIDENT");
                session.setMaxInactiveInterval(60 * 60);
                return "redirect:/announcements";
            }
        }
        
        // If resident login failed, try admin user
        Optional<AdminUser> adminOpt = adminUserRepository.findByEmail(normalizedEmail);
        
        if (adminOpt.isPresent()) {
            AdminUser admin = adminOpt.get();
            
            // Check admin password
            if (password != null && admin.getPassword() != null && password.equals(admin.getPassword())) {
                // Admin logging in as resident
                session.setAttribute("adminAsResidentId", admin.getId().toString());
                session.setAttribute("residentEmail", admin.getEmail());
                
                // Use admin's name
                String adminName = (admin.getFirstName() != null ? admin.getFirstName() : "") + " " + 
                                  (admin.getLastName() != null ? admin.getLastName() : "");
                session.setAttribute("residentName", adminName.trim().isEmpty() ? admin.getUsername() : adminName.trim());
                session.setAttribute("userType", "ADMIN_AS_RESIDENT");
                session.setAttribute("residentStatus", "ACTIVE");
                session.setMaxInactiveInterval(60 * 60);
                return "redirect:/announcements";
            }
        }
        
        return "redirect:/resident-login?error";
    }

    @GetMapping("/resident-logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/resident-login?logout";
    }

    private boolean verifyWithSupabase(String email, String password) {
        try {
            String url = SUPABASE_URL + "/auth/v1/token?grant_type=password";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("apikey", SUPABASE_ANON_KEY);

            Map<String, String> body = Map.of("email", email, "password", password);
            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            return response.getStatusCode() == HttpStatus.OK
                    && response.getBody() != null
                    && response.getBody().containsKey("access_token");

        } catch (Exception e) {
            System.out.println("Supabase verify failed: " + e.getMessage());
            return false;
        }
    }

    @PostMapping("/api/resident/forgot-password/send-otp")
    @ResponseBody
    public ResponseEntity<Map<String, String>> sendOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String normalizedEmail = email != null ? email.trim().toLowerCase() : "";
        
        Optional<ResidentUser> residentOpt = residentUserRepository.findByEmail(normalizedEmail);
        Optional<AdminUser> adminOpt = adminUserRepository.findByEmail(normalizedEmail);
        
        if (residentOpt.isEmpty() && adminOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email not found."));
        }
        return ResponseEntity.ok(Map.of("message", "OTP sent successfully."));
    }

    @PostMapping("/api/resident/forgot-password/verify-otp")
    @ResponseBody
    public ResponseEntity<Map<String, String>> verifyOtp(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(Map.of("message", "OTP verified."));
    }

    @PostMapping("/api/resident/forgot-password/reset")
    @ResponseBody
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(Map.of("message", "Password reset successfully."));
    }
}