package com.example.demo.controller;

import com.example.demo.dto.AdminUserDTO;
import com.example.demo.dto.ResidentDTO;
import com.example.demo.model.Activitylogs;
import com.example.demo.model.AdminUser;
import com.example.demo.model.ResidentUser;
import com.example.demo.services.AdminUserServices;
import com.example.demo.services.AnnouncementsService;
import com.example.demo.services.ResidentUserService;
import com.example.demo.services.EmailService;
import com.example.demo.services.ActivityLogService;
import com.example.demo.services.BlotterService;
import com.example.demo.services.DocumentRequestService;
import com.example.demo.services.SosReportsService;
import com.example.demo.services.SafetyReportService;
import com.example.demo.services.ProgramBudgetService;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import java.security.Principal;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.InitBinder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.TimeZone;

import org.springframework.web.bind.annotation.RequestBody;

import java.util.HashMap;
import java.util.ArrayList;


@Controller
public class MainController {

    @Autowired private ActivityLogService activityLogService;
    @Autowired private AdminUserServices adminUserService;
    @Autowired private BlotterService blotterService;
    @Autowired private DocumentRequestService documentService;
    @Autowired private SosReportsService sosService;
    @Autowired private SafetyReportService safetyReportService;
    @Autowired private ResidentUserService residentUserService;
    @Autowired private BCryptPasswordEncoder passwordEncoder;
    @Autowired private AnnouncementsService announcementsService;
    @Autowired private EmailService emailService;
    @Autowired private HttpSession session;
    @Autowired private ProgramBudgetService programBudgetService;
    
    // Track last modification time for accounts polling
    private volatile long lastAccountsModificationTime = System.currentTimeMillis();

    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Manila"));
    }

    @InitBinder
    public void initBinder(WebDataBinder binder) {
        binder.registerCustomEditor(String.class,
            new org.springframework.beans.propertyeditors.StringTrimmerEditor(true));
        binder.setDisallowedFields("profilePicture");
    }

    private final ConcurrentHashMap<String, OtpEntry> forgotPasswordOtpStore = new ConcurrentHashMap<>();

    private static class OtpEntry {
        String otp;
        LocalDateTime expiry;

        OtpEntry(String otp) {
            this.otp    = otp;
            this.expiry = LocalDateTime.now().plusMinutes(10);
        }

        boolean isExpired() {
            return LocalDateTime.now().isAfter(expiry);
        }
    }

    // =========================================================
    // SHARED HELPER — adds current admin's basic info to model
    // =========================================================

    private AdminUser addCurrentAdminToModel(Principal principal, Model model) {
        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
        if (admin != null) {
            model.addAttribute("currentUser",   admin.getName());
            model.addAttribute("currentrole",   admin.getRole());
            model.addAttribute("currentstatus", admin.getEmpstatus());
        }
        return admin;
    }

    // =========================================================
    // AUTH / NAVIGATION
    // =========================================================
    @GetMapping("/")
    public String root() {
        return "redirect:/landing-page";
    }


    @GetMapping("/login")
    public String LoginPage() {
        return "Login";
    }

    @GetMapping("/landing-page")
    public String landingPage() {
        return "Landingpage";
    }

    // =========================================================
    // ACCOUNTS PAGE
    // =========================================================

    @GetMapping("/account")
    public String AccountPage(Model model, Principal principal) {

        AdminUser currentAdmin = addCurrentAdminToModel(principal, model);

        Set<String> allowedRoles = Set.of("ADMIN", "SECRETARY", "BARANGAY-CAPTAIN");

        if (currentAdmin == null || !allowedRoles.contains(currentAdmin.getRole())) {
            return "redirect:/home";
        }

        model.addAttribute("currentusername", currentAdmin.getUsername());

        List<AdminUserDTO> adminDTOs = adminUserService.getAllAdminsForTable();
        model.addAttribute("admins", adminDTOs);

        model.addAttribute("emailList",    adminUserService.extractEmails(adminDTOs));
        model.addAttribute("usernameList", adminUserService.extractUsernames(adminDTOs));
        model.addAttribute("phoneList",    adminUserService.extractPhoneNumbers(adminDTOs));

        List<ResidentDTO> allResidents = residentUserService.getAllResidentsDTO();

        List<ResidentDTO> activeResidents = allResidents.stream()
            .filter(r -> !"Archived".equalsIgnoreCase(r.status()))
            .toList();

        List<ResidentDTO> archivedResidents = allResidents.stream()
            .filter(r -> "Archived".equalsIgnoreCase(r.status()))
            .toList();

        model.addAttribute("residentList", activeResidents);
        model.addAttribute("archivedResidents", archivedResidents);

        model.addAttribute("newAdmin", new AdminUser());
        model.addAttribute("newResident", new ResidentUser());

        return "Accounts";
    }

    // =========================================================
    // REGISTER / UPDATE ADMIN
    // =========================================================

    @PostMapping("/register")
    public String registerAdmin(
            @ModelAttribute("newAdmin") AdminUser admin,
            @RequestParam("profilePicture") org.springframework.web.multipart.MultipartFile file,
            @RequestParam(value = "redirectTo", required = false) String redirectTo,
            @RequestParam(value = "profilePictureUrl", required = false) String profilePictureUrl,
            RedirectAttributes redirectAttributes,
            Principal principal,
            HttpServletRequest request) throws java.io.IOException {

        AdminUser existingAdmin = (admin.getId() != null)
                ? adminUserService.getAdminById(admin.getId())
                : null;

        // Determine where to redirect after save
        String successRedirect = "redirect:/account";
        String errorRedirect   = "redirect:/account";
        if ("profile".equals(redirectTo)) {
            successRedirect = "redirect:/user-profile";
            errorRedirect   = "redirect:/user-profile";
        }

        try {
            if (existingAdmin != null) {
                existingAdmin.setFirstName(admin.getFirstName());
                existingAdmin.setLastName(admin.getLastName());
                existingAdmin.setUsername(admin.getUsername());
                existingAdmin.setEmail(admin.getEmail());
                existingAdmin.setPhoneNumber(admin.getPhoneNumber());
                existingAdmin.setAddress(admin.getAddress());
                existingAdmin.setGender(admin.getGender());
                existingAdmin.setRole(admin.getRole());
                existingAdmin.setBirthDate(admin.getBirthDate());

                // Handle profile picture URL from Supabase
                if (profilePictureUrl != null && !profilePictureUrl.isBlank()) {
                    existingAdmin.setProfilePicture(profilePictureUrl);
                    System.out.println("Saving profile picture URL: " + profilePictureUrl);
                }

                String newPassword = admin.getPassword();
                if (newPassword != null && !newPassword.isBlank()) {
                    existingAdmin.setPassword(passwordEncoder.encode(newPassword));
                    if ("New".equals(existingAdmin.getEmpstatus()) ||
                            "Newly Updated".equals(existingAdmin.getEmpstatus())) {
                        existingAdmin.setEmpstatus("Working");
                    }
                }

                adminUserService.saveAdmin(existingAdmin);
                activityLogService.log(
                    existingAdmin.getName(), "ADMIN", "UPDATED", "Accounts",
                    truncate("Updated admin account: " + existingAdmin.getUsername()),
                    request.getRemoteAddr(), "Success"
                );
                
                // Update modification timestamp
                lastAccountsModificationTime = System.currentTimeMillis();

            } else {
                if (adminUserService.existsByEmail(admin.getEmail())) {
                    redirectAttributes.addFlashAttribute("error", "Email already exists.");
                    return errorRedirect;
                }
                if (adminUserService.existsByUsername(admin.getUsername())) {
                    redirectAttributes.addFlashAttribute("error", "Username already taken.");
                    return errorRedirect;
                }

                admin.setPassword(passwordEncoder.encode(admin.getPassword()));
                adminUserService.saveAdmin(admin);
                activityLogService.log(
                    principal.getName(), admin.getRole(), "CREATED", "Accounts",
                    truncate("Created new Employee account: " + admin.getUsername()),
                    request.getRemoteAddr(), "Success"
                );
                
                // Update modification timestamp
                lastAccountsModificationTime = System.currentTimeMillis();
            }

            session.removeAttribute("currentOTP");
            redirectAttributes.addFlashAttribute("success", "Account saved successfully.");

        } catch (Exception e) {
            activityLogService.log(
                principal.getName(), "ADMIN", "ERROR", "Accounts",
                truncate("Failed to save account: " + e.getMessage()),
                request.getRemoteAddr(), "Failed"
            );
            redirectAttributes.addFlashAttribute("error", "Something went wrong: " + e.getMessage());
        }

        return successRedirect;
    }

    // Prevents VARCHAR(255) overflow in activity logs
    private String truncate(String text) {
        if (text == null) return null;
        return text.length() > 250 ? text.substring(0, 250) + "..." : text;
    }

    
    // ARCHIVE EMPLOYEE 
    
    @GetMapping("/delete-admin/{id}")
        public String archiveAdmin(@PathVariable Long id, Principal principal, HttpServletRequest request) {
            AdminUser currentAdmin = adminUserService.getAdminByEmail(principal.getName());
            AdminUser admin = adminUserService.getAdminById(id);
            if (admin != null) {
                admin.setEmpstatus("Archived");
                adminUserService.saveAdmin(admin);

                activityLogService.log(
                    currentAdmin.getName(),
                    admin.getRole(),
                    "ARCHIVED", "Accounts",
                    "Archived admin account: " + admin.getUsername(),
                    request.getRemoteAddr(),
                    "Success"
                );
                
                // Update modification timestamp
                lastAccountsModificationTime = System.currentTimeMillis();
            }
            return "redirect:/account";
        }

    // =========================================================
    // ARCHIVE RESIDENT
    // =========================================================

    @GetMapping("/residents/delete/{id}")
    public String archiveResident(@PathVariable UUID id, Principal principal, HttpServletRequest request) {
        AdminUser currentAdmin = adminUserService.getAdminByEmail(principal.getName());
        ResidentUser resident = residentUserService.getResidentById(id);
        if (resident != null) {
            resident.setStatus("Archived");
            residentUserService.saveResident(resident);
            activityLogService.log(
                currentAdmin.getName(), currentAdmin.getRole(), "ARCHIVED", "Accounts",
                "Archived resident account: " + resident.getFirstName() + " " + resident.getLastName(),
                request.getRemoteAddr(), "Success"
            );
            
            // Update modification timestamp
            lastAccountsModificationTime = System.currentTimeMillis();
        }
        return "redirect:/account";
    }



    // =========================================================
    // VERIFY RESIDENT
    // =========================================================

    @PostMapping("/residents/verify/{id}")
@ResponseBody
public ResponseEntity<?> verifyResident(@PathVariable UUID id) {
    ResidentUser resident = residentUserService.getResidentById(id);
    
    if (resident == null) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Resident not found");
    }
    
    resident.setAccount_status("VERIFIED");
    residentUserService.saveResident(resident);
    
    // Update modification timestamp
    lastAccountsModificationTime = System.currentTimeMillis();
    
    return ResponseEntity.ok().body("{\"success\":true}");
}




    // =========================================================
    // REGISTER / UPDATE RESIDENT
    // =========================================================

    @PostMapping("/residents/register")
    public String registerResident(
            @ModelAttribute("newResident") ResidentUser resident,
            @RequestParam("selfieFile") org.springframework.web.multipart.MultipartFile file)
            throws java.io.IOException {

        if (resident.getId() != null && resident.getId().toString().isEmpty()) {
            resident.setId(null);
        }

        ResidentUser existingResident = null;
        if (resident.getId() != null) {
            existingResident = residentUserService.getResidentById(resident.getId());
        }

        if ("Auto-generated".equals(resident.getResidentId()) ||
                (resident.getResidentId() != null && resident.getResidentId().isEmpty())) {
            resident.setResidentId(null);
        }

        if (file != null && !file.isEmpty()) {
            String base64Selfie = Base64.getEncoder().encodeToString(file.getBytes());
            resident.setSelfie(base64Selfie);
            resident.setImageType(file.getContentType());
        } else if (existingResident != null) {
            resident.setSelfie(existingResident.getSelfie());
            resident.setImageType(existingResident.getImageType());
        }

        residentUserService.saveResident(resident);
        
        // Update modification timestamp
        lastAccountsModificationTime = System.currentTimeMillis();
        
        return "redirect:/account";
    }



// =========================================================
// SIMPLE POLLING ENDPOINT (like Safety Reports)
// =========================================================

@GetMapping("/accounts/api/poll")
@ResponseBody
public ResponseEntity<Map<String, Object>> pollAccounts() {
    Map<String, Object> response = new HashMap<>();
    response.put("lastModified", lastAccountsModificationTime);
    return ResponseEntity.ok(response);
}

    // =========================================================
    // EMAIL ENDPOINTS
    // =========================================================

    @PostMapping("/send-password")
    @ResponseBody
    public ResponseEntity<String> sendPassword(
            @RequestParam String email,
            @RequestParam String password) {
        try {
            AdminUser admin = adminUserService.getAdminByEmail(email);
            String fullName = (admin != null) ? admin.getName() : "User";
            emailService.sendGeneratedPassword(email, password, fullName);
            return ResponseEntity.ok("Password sent successfully");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to send email: " + e.getMessage());
        }
    }

    @PostMapping("/send-otp")
    @ResponseBody
    public ResponseEntity<String> sendOtp(@RequestParam String email) {
        Long lastSent = (Long) session.getAttribute("otp_timestamp");
        long currentTime = System.currentTimeMillis();

        AdminUser admin = adminUserService.getAdminByEmail(email);
        if (admin == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Account not found.");
        }

        System.out.println("Debug empstatus: " + admin.getEmpstatus());

        if ("Archived".equalsIgnoreCase(admin.getEmpstatus())) {
            return ResponseEntity.ok("Your Account has been deactivated...");
        }

        if (lastSent != null && (currentTime - lastSent) < 5000) {
            return ResponseEntity.ok("OTP already sent, please try again later.");
        }

        try {
            SecureRandom secureRandom = new SecureRandom();
            String otp = String.valueOf(100000 + secureRandom.nextInt(900000));
            String fullName = admin.getName();
            session.setAttribute("currentOTP", otp);
            session.setAttribute("otp_timestamp", currentTime);
            emailService.sendOTP(email, otp, fullName);
            System.out.println("DEBUG: OTP sent is: " + otp);
            return ResponseEntity.ok("OTP Sent Successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error sending email");
        }
    }

    @PostMapping("/verify-otp")
    @ResponseBody
    public ResponseEntity<String> verifyOtp(
            @RequestParam String otp,
            @RequestParam(required = false) String email,
            HttpServletRequest request) {

        System.out.println("=== VERIFY OTP CALLED ===");
        System.out.println("Email received: " + email);
        System.out.println("OTP received: " + otp);

        String sessionOtp = (String) session.getAttribute("currentOTP");

        if (otp != null && otp.equals(sessionOtp)) {
            String userName = "UNKNOWN";
            String userRole = "UNKNOWN";

            if (email != null) {
                AdminUser currentAdmin = adminUserService.getAdminByEmail(email);
                if (currentAdmin != null) {
                    userName = currentAdmin.getName();
                    userRole = currentAdmin.getRole();
                    System.out.println("=== LOGGING IN: " + userName + " ===");
                }
            }

            activityLogService.log(
                userName, userRole, "LOGGED IN", "Dashboard",
                "User logged in successfully",
                request.getRemoteAddr(), "Success"
            );

            return ResponseEntity.ok("Verified");
        }

        System.out.println("=== OTP MISMATCH ===");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid OTP");
    }

    @GetMapping("/check-admin-email")
    @ResponseBody
    public ResponseEntity<String> checkAdminEmail(
            @RequestParam String email,
            @RequestParam(required = false) String password) {

        AdminUser admin = adminUserService.getAdminByEmail(email);

        if (admin == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Not an Admin");
        }
        if ("Archived".equalsIgnoreCase(admin.getEmpstatus())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Your Account is deactivated.");
        }
        // Validate password if provided
        if (password != null && !passwordEncoder.matches(password, admin.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid email or password.");
        }

        return ResponseEntity.ok("Admin found");
    }

    // =========================================================
    // DASHBOARD / HOME
    // =========================================================

    @GetMapping("/home")
    public String HomePage(Principal principal, Model model) {
        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());

        if (admin != null) {
            String role = admin.getRole();

            model.addAttribute("currentUser",   admin.getName());
            model.addAttribute("currentrole",   role);
            model.addAttribute("currentstatus", admin.getEmpstatus());
            model.addAttribute("residents", residentUserService.countResidents());
            model.addAttribute("blotterCount",        blotterService.countAll());
            model.addAttribute("latestAnnouncement", announcementsService.getLatest());
            model.addAttribute("pendingDocuments",   documentService.countPending());
            model.addAttribute("budget", programBudgetService.getTotalBudget());

            boolean isPrivileged = "ADMIN".equals(role)
                                || "BARANGAY-CAPTAIN".equals(role)
                                || "SECRETARY".equals(role);

            if (isPrivileged) {
                model.addAttribute("recentLogs",         activityLogService.getRecentLogs(5));
                model.addAttribute("sosAlertsThisMonth",  sosService.countThisMonth());

                Map<String, Long> safetyStats = safetyReportService.getStatusCounts();

                long resolved    = safetyStats.getOrDefault("resolved",      0L)
                                + safetyStats.getOrDefault("arch-resolved", 0L);
                long arch        = safetyStats.getOrDefault("archived",      0L);
                long inProgress  = safetyStats.getOrDefault("in progress",   0L);
                long unverified  = safetyStats.getOrDefault("unverified",    0L);
                long approved    = safetyStats.getOrDefault("approved",      0L);

                long allUnresolved = arch + inProgress + unverified + approved;
                long allReports    = resolved + allUnresolved;

                model.addAttribute("resolvedIncidents",   resolved);
                model.addAttribute("unresolvedIncidents", allUnresolved);
                model.addAttribute("allreports",          allReports);
            }

        } else {
            model.addAttribute("currentUser", "Admin");
            model.addAttribute("currentrole", "USER");
        }

        model.addAttribute("newAdmin", new AdminUser());
        return "Dashboard";
    }

    // =========================================================
    // OTHER PAGES
    // =========================================================

    @GetMapping("/program-calendar")
    public String ProgramCalendarPage(Principal principal, Model model) {
        AdminUser admin = addCurrentAdminToModel(principal, model);

        System.out.println(admin.getRole());
        model.addAttribute("newAdmin", new AdminUser());

        Set<String> allowedRoles = Set.of("ADMIN", "SECRETARY", "BARANGAY-CAPTAIN", "TREASURER");

        if (!allowedRoles.contains(admin.getRole())) {
            return "redirect:/home";
        }

        return "ProgramCalendar";
    }

    @GetMapping("/program-planner")
    public String ProgramPlannerPage(Principal principal, Model model) {
        AdminUser admin = addCurrentAdminToModel(principal, model);
        model.addAttribute("newAdmin", new AdminUser());

        Set<String> allowedRoles = Set.of("ADMIN", "SECRETARY", "BARANGAY-CAPTAIN", "TREASURER");

        if (!allowedRoles.contains(admin.getRole())) {
            return "redirect:/home";
        }
        return "ProgramPlanner";
    }

    @GetMapping("/requests")
    public String RequestsPage(Principal principal, Model model) {
        addCurrentAdminToModel(principal, model);
        model.addAttribute("newAdmin", new AdminUser());
        return "Requests";
    }

    @GetMapping("/Activity-logs")
    public String viewActivityLogs(
            Model model,
            Principal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        AdminUser currentAdmin = addCurrentAdminToModel(principal, model);

        Set<String> allowedRoles = Set.of("ADMIN", "SECRETARY", "BARANGAY-CAPTAIN");

        if (currentAdmin == null || !allowedRoles.contains(currentAdmin.getRole())) {
            return "redirect:/home";
        }

        model.addAttribute("newAdmin", new AdminUser());

        org.springframework.data.domain.Page<Activitylogs> logsPage =
            activityLogService.getLogsPaginated(page, size);

        model.addAttribute("activityLogs", logsPage.getContent());
        model.addAttribute("currentPage",  page);
        model.addAttribute("totalPages",   logsPage.getTotalPages());

        return "ActivityLogs";
    }

    // =========================================================
    // FORGOT PASSWORD
    // =========================================================

    @PostMapping("/api/forgot-password/send-otp")
    @ResponseBody
    public ResponseEntity<?> forgotPasswordSendOtp(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        AdminUser admin = adminUserService.getAdminByEmail(email);

        if (admin == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "No account found with that email address"));
        }

        System.out.println("Debug empstatus (forgot password): " + admin.getEmpstatus());

        if ("Newly Updated".equals(admin.getEmpstatus())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Your account has been updated recently, please check your email for your temporary password"));
        }

        SecureRandom secureRandom = new SecureRandom();
        String otp = String.valueOf(100000 + secureRandom.nextInt(900000));
        String fullName = admin.getName();
        forgotPasswordOtpStore.put(email, new OtpEntry(otp));

        try {
            System.out.println("DEBUG: " + fullName);
            emailService.sendOTP(email, otp, fullName);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to send email. Please try again."));
        }

        return ResponseEntity.ok(Map.of("message", "OTP sent successfully"));
    }

    @PostMapping("/api/forgot-password/verify-and-reset")
    @ResponseBody
    public ResponseEntity<?> forgotPasswordVerifyAndReset(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String otp   = payload.get("otp");

        OtpEntry entry = forgotPasswordOtpStore.get(email);

        if (entry == null || entry.isExpired()) {
            forgotPasswordOtpStore.remove(email);
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Verification code has expired. Please request a new one."));
        }

        if (!entry.otp.equals(otp)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid verification code"));
        }

        forgotPasswordOtpStore.remove(email);

        String tempPassword = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        AdminUser admin = adminUserService.getAdminByEmail(email);
        String fullName = admin.getName();
        admin.setPassword(passwordEncoder.encode(tempPassword));
        admin.setEmpstatus("Newly Updated");
        adminUserService.saveAdmin(admin);

        try {
            System.out.println("DEBUG: " + fullName);
            emailService.sendGeneratedPassword(email, tempPassword, fullName);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Password was reset but failed to send email. Please contact your administrator."));
        }

        return ResponseEntity.ok(Map.of("message", "Temporary password sent successfully"));
    }
}