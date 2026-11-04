package com.example.demo.controller;

import com.example.demo.model.ResidentUser;
import com.example.demo.services.ResidentUserService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Controller
@RequestMapping("/resident")
public class ResidentRegisterController {

    @Autowired
    private ResidentUserService residentUserService;

    @PersistenceContext
    private EntityManager entityManager;

    private static final String SUPABASE_URL = "https://upfrofppponiqffbssqb.supabase.co";
    private static final String SUPABASE_ANON_KEY = "sb_publishable_tZyxrTJrpd_OD5-TKUkT8Q__DnuY0tj";
    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/register")
    public String showRegisterPage() {
        return "ResidentRegister";
    }

    @PostMapping("/register")
    @ResponseBody
    public ResponseEntity<String> handleRegister(
            @RequestParam("firstName") String firstName,
            @RequestParam("lastName") String lastName,
            @RequestParam("gender") String gender,
            @RequestParam("birthDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate birthDate,
            @RequestParam("address") String address,
            @RequestParam("email") String email,
            @RequestParam("mobileNumber") String mobileNumber,
            @RequestParam("password") String password,
            @RequestParam(value = "isPwd", defaultValue = "false") boolean isPwd,
            @RequestParam(value = "pwdIdUri", defaultValue = "") String pwdIdUri,
            @RequestParam(value = "isSenior", defaultValue = "false") boolean isSenior,
            @RequestParam(value = "seniorIdUri", defaultValue = "") String seniorIdUri
    ) {
        String normalizedEmail = email.trim().toLowerCase();

        System.out.println("=== RESIDENT REGISTER: " + normalizedEmail + " ===");

        // 1. Check if resident already exists in residents table
        List<ResidentUser> emailCheck = entityManager
                .createQuery(
                    "SELECT r FROM ResidentUser r WHERE LOWER(r.email) = :email",
                    ResidentUser.class)
                .setParameter("email", normalizedEmail)
                .getResultList();

        if (!emailCheck.isEmpty()) {
            System.out.println("=== EMAIL ALREADY IN RESIDENTS TABLE ===");
            return ResponseEntity.badRequest().body("email already registered");
        }

        // 2. Check mobile in residents table
        List<ResidentUser> mobileCheck = entityManager
                .createQuery(
                    "SELECT r FROM ResidentUser r WHERE r.mobileNumber = :mobile",
                    ResidentUser.class)
                .setParameter("mobile", mobileNumber.trim())
                .getResultList();

        if (!mobileCheck.isEmpty()) {
            return ResponseEntity.badRequest().body("mobile number already in use");
        }

        // 3. Check if email exists in admin_users table - if yes, that's fine, just don't conflict
        List<Object> adminCheck = entityManager
                .createNativeQuery("SELECT COUNT(*) FROM admin_users WHERE LOWER(email) = :email")
                .setParameter("email", normalizedEmail)
                .getResultList();
        
        long adminCount = ((Number) adminCheck.get(0)).longValue();
        if (adminCount > 0) {
            System.out.println("Email exists in admin_users - this is allowed, continuing...");
        }

        // 4. Register with Supabase (optional, continue even if fails)
        try {
            createSupabaseUser(normalizedEmail, password, firstName, lastName);
            System.out.println("Supabase registration attempted");
        } catch (Exception e) {
            System.out.println("Supabase error (continuing): " + e.getMessage());
        }

        // 5. Save to residents table - let JPA generate the ID automatically
        try {
            ResidentUser resident = new ResidentUser();
            // DO NOT set an ID - let the database auto-generate it
            resident.setFirstName(firstName.trim());
            resident.setLastName(lastName.trim());
            resident.setGender(gender);
            resident.setBirthDate(birthDate);
            resident.setAddress(address.trim());
            resident.setEmail(normalizedEmail);
            resident.setMobileNumber(mobileNumber.trim());
            resident.setValidId(password);

            if (isPwd && !pwdIdUri.trim().isEmpty()) {
                resident.setSelfie("PWD:" + pwdIdUri.trim());
            }
            if (isSenior && !seniorIdUri.trim().isEmpty()) {
                resident.setImageType("SENIOR:" + seniorIdUri.trim());
            }

            resident.setStatus("PENDING");
            resident.setAccount_status("PENDING");

            residentUserService.saveResident(resident);
            System.out.println("=== RESIDENT SAVED: " + normalizedEmail + " ===");

        } catch (Exception e) {
            System.out.println("ERROR SAVING RESIDENT: " + e.getMessage());
            e.printStackTrace();
            
            // Check if it's a foreign key error
            if (e.getMessage() != null && e.getMessage().contains("foreign key")) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Database constraint error - the residents table has a foreign key to users table that doesn't exist. Please run: ALTER TABLE residents DROP CONSTRAINT IF EXISTS fk_user");
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("server error: " + e.getMessage());
        }

        return ResponseEntity.ok("success");
    }

    private void createSupabaseUser(String email, String password,
                                               String firstName, String lastName) {
        try {
            String url = SUPABASE_URL + "/auth/v1/signup";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("apikey", SUPABASE_ANON_KEY);

            Map<String, Object> body = Map.of(
                "email", email,
                "password", password,
                "data", Map.of("first_name", firstName, "last_name", lastName)
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            try {
                restTemplate.postForEntity(url, request, Map.class);
                System.out.println("Supabase: user created/checked - " + email);
            } catch (HttpClientErrorException ex) {
                int code = ex.getStatusCode().value();
                if (code == 400 || code == 422) {
                    System.out.println("Supabase: user already exists - " + email);
                } else {
                    System.out.println("Supabase error " + code + ": " + ex.getMessage());
                }
            }

        } catch (Exception e) {
            System.out.println("Supabase unreachable: " + e.getMessage());
        }
    }
}