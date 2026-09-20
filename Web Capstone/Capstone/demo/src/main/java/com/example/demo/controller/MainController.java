package com.example.demo.controller;

import java.net.URI;
import java.security.Principal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TimeZone;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.InitBinder;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.example.demo.dto.AdminUserDTO;
import com.example.demo.dto.ResidentDTO;
import com.example.demo.model.Activitylogs;
import com.example.demo.model.AdminUser;
import com.example.demo.model.Announcements;
import com.example.demo.model.ContactHelpRequest;
import com.example.demo.model.ResidentUser;
import com.example.demo.repository.CensusRecordRepository;
import com.example.demo.services.ActivityLogService;
import com.example.demo.services.AdminUserServices;
import com.example.demo.services.AnnouncementsService;
import com.example.demo.services.BlotterService;
import com.example.demo.services.CensusRecordService;
import com.example.demo.services.ContactHelpService;
import com.example.demo.services.DocumentRequestService;
import com.example.demo.services.EmailService;
import com.example.demo.services.ProgramBudgetService;
import com.example.demo.services.ProgramCalendarService;
import com.example.demo.services.RentalService;
import com.example.demo.services.ResidentUserService;
import com.example.demo.services.SafetyReportService;
import com.example.demo.services.SosReportsService;
import com.example.demo.services.SystemLogsService;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;


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
    @Autowired private CensusRecordRepository censusRecordRepository;
    @Autowired private RentalService rentalService;
    @Autowired private CensusRecordService censusRecordService;
    @Autowired private SystemLogsService systemLogsService;


    @Autowired(required = false)
    private ProgramCalendarService programCalendarService;

    @Autowired(required = false)
    private ContactHelpService contactHelpService;

    @Autowired
    private java.util.concurrent.ExecutorService dashboardQueryExecutor;
    

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
    // IMAGE HELPER — validates the upload, shrinks it to a
    // 128x128 JPEG, and returns it as a data URI
    // =========================================================

    private String toAvatarDataUri(org.springframework.web.multipart.MultipartFile file) throws java.io.IOException {
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Profile picture must be an image file.");
        }

        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        net.coobird.thumbnailator.Thumbnails.of(file.getInputStream())
                .size(128, 128)
                .crop(net.coobird.thumbnailator.geometry.Positions.CENTER)
                .outputFormat("jpg")
                .outputQuality(0.8)
                .toOutputStream(out);

        return "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(out.toByteArray());
    }

    // =========================================================
    // AVATAR ENDPOINT — serves the profile picture as a real
    // image file with cache headers so browsers stop re-downloading
    // the whole dashboard HTML just to render one avatar.
    // =========================================================

    @GetMapping("/media/avatar/{id}")
    public ResponseEntity<?> getAvatar(@PathVariable Long id) {
        AdminUser admin = adminUserService.getAdminById(id);
        if (admin == null) {
            return ResponseEntity.notFound().build();
        }
        String profilePicture = admin.getProfilePicture();
        if (profilePicture == null || profilePicture.isBlank()) {
            return ResponseEntity.notFound().build();
        }

        try {
            if (profilePicture.startsWith("data:image")) {
                int commaIdx = profilePicture.indexOf(',');
                if (commaIdx < 0) {
                    return ResponseEntity.notFound().build();
                }
                String meta = profilePicture.substring(5, commaIdx);
                String base64 = profilePicture.substring(commaIdx + 1);
                byte[] bytes = Base64.getDecoder().decode(base64);

                MediaType mediaType = meta.startsWith("image/png")
                        ? MediaType.IMAGE_PNG
                        : MediaType.IMAGE_JPEG;

                return ResponseEntity.ok()
                        .contentType(mediaType)
                        .cacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic().immutable())
                        .body(bytes);
            }

            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(profilePicture))
                    .cacheControl(CacheControl.maxAge(1, TimeUnit.DAYS).cachePublic())
                    .build();

        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // =========================================================
    // ANNOUNCEMENT IMAGE ENDPOINT — same idea as avatar but for
    // announcement images that are also stored as Base64 data URIs.
    // =========================================================

    @GetMapping("/media/announcement/{id}")
    public ResponseEntity<?> getAnnouncementImage(@PathVariable Long id) {
        try {
            var announcement = announcementsService.getById(id);
            if (announcement == null || announcement.getImage() == null) {
                return ResponseEntity.notFound().build();
            }
            String img = announcement.getImage();

            if (img.startsWith("data:image")) {
                int commaIdx = img.indexOf(',');
                if (commaIdx < 0) return ResponseEntity.notFound().build();
                String meta   = img.substring(5, commaIdx);
                String base64 = img.substring(commaIdx + 1);
                byte[] bytes  = Base64.getDecoder().decode(base64);

                MediaType mediaType = meta.startsWith("image/png")  ? MediaType.IMAGE_PNG
                                    : meta.startsWith("image/webp") ? MediaType.parseMediaType("image/webp")
                                    : MediaType.IMAGE_JPEG;

                return ResponseEntity.ok()
                        .contentType(mediaType)
                        .cacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic().immutable())
                        .body(bytes);
            }

            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(img))
                    .cacheControl(CacheControl.maxAge(1, TimeUnit.DAYS).cachePublic())
                    .build();

        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
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

        Set<String> allowedRoles = Set.of("ADMIN", "SECRETARY", "BARANGAY-CAPTAIN", "SECRETARIAT STAFF");

        if (currentAdmin == null || !allowedRoles.contains(currentAdmin.getRole())) {
            return "redirect:/home";
        }
        if ("Archived".equalsIgnoreCase(currentAdmin.getEmpstatus())) {
                return "redirect:/logout";
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
            @RequestParam(value = "profilePicture", required = false) org.springframework.web.multipart.MultipartFile file,
            @RequestParam(value = "redirectTo", required = false) String redirectTo,
            @RequestParam(value = "profilePictureUrl", required = false) String profilePictureUrl,
            RedirectAttributes redirectAttributes,
            Principal principal,
            HttpServletRequest request) throws java.io.IOException {

        AdminUser existingAdmin = (admin.getId() != null)
                ? adminUserService.getAdminById(admin.getId())
                : null;

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
                if (admin.getRole() != null && !admin.getRole().isBlank()) {
                    existingAdmin.setRole(admin.getRole());
                }
                existingAdmin.setBirthDate(admin.getBirthDate());

                if (file != null && !file.isEmpty()) {
                    existingAdmin.setProfilePicture(toAvatarDataUri(file));
                    System.out.println("Saved resized profile picture (" + file.getSize() + " bytes uploaded)");
                } else if (profilePictureUrl != null && !profilePictureUrl.isBlank()) {
                    existingAdmin.setProfilePicture(profilePictureUrl);
                    System.out.println("Saving profile picture URL: " + profilePictureUrl);
                }

                String newPassword = admin.getPassword();
                if (newPassword != null && !newPassword.isBlank()) {
                    existingAdmin.setPassword(passwordEncoder.encode(newPassword));
                    
                    if ("profile".equals(redirectTo)) {
                        existingAdmin.setEmpstatus("Working");
                    } else {
                        existingAdmin.setEmpstatus("Newly Updated");
                    }
                }

                adminUserService.saveAdmin(existingAdmin);

                AdminUser actingAdmin = adminUserService.getAdminByEmail(principal.getName());
                String actorName = actingAdmin != null ? actingAdmin.getName() : principal.getName();
                String actorRole = actingAdmin != null ? actingAdmin.getRole() : "ADMIN";

                activityLogService.log(
                    actorName, actorRole, "UPDATED", "Accounts",
                    truncate("Updated account details for " + existingAdmin.getName() + " (" + existingAdmin.getRole() + ")"),
                    request.getRemoteAddr(), "Success"
                );
                
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

                if (file != null && !file.isEmpty()) {
                    admin.setProfilePicture(toAvatarDataUri(file));
                    System.out.println("Saved resized profile picture (" + file.getSize() + " bytes uploaded)");
                } else if (profilePictureUrl != null && !profilePictureUrl.isBlank()) {
                    admin.setProfilePicture(profilePictureUrl);
                }

                admin.setPassword(passwordEncoder.encode(admin.getPassword()));
                adminUserService.saveAdmin(admin);
                activityLogService.log(
                    principal.getName(), admin.getRole(), "CREATED", "Accounts",
                    truncate("Created a new employee account for " + admin.getName() + " with role " + admin.getRole()),
                    request.getRemoteAddr(), "Success"
                );
                
                lastAccountsModificationTime = System.currentTimeMillis();
            }

            session.removeAttribute("currentOTP");
            redirectAttributes.addFlashAttribute("success", "Account saved successfully.");

        } catch (Exception e) {
            activityLogService.log(
                    principal.getName(), "ADMIN", "ERROR", "Accounts",
                    truncate("Failed to save account — " + e.getMessage()),
                    request.getRemoteAddr(), "Failed"
                );
            redirectAttributes.addFlashAttribute("error", "Something went wrong: " + e.getMessage());
        }

        return successRedirect;
    }

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
                    currentAdmin.getName(), admin.getRole(), "ARCHIVED", "Accounts",
                    "Deactivated the account of " + admin.getName() + " (" + admin.getRole() + ")",
                    request.getRemoteAddr(), "Success"
                );
                
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
                    "Archived the resident account of " + resident.getFirstName() + " " + resident.getLastName(),
                    request.getRemoteAddr(), "Success"
                );
            
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
        
        lastAccountsModificationTime = System.currentTimeMillis();
        
        return "redirect:/account";
    }

    @PostMapping("/residents/restore/{id}")
    @ResponseBody
    public ResponseEntity<?> restoreResident(@PathVariable UUID id, Principal principal, HttpServletRequest request) {
        AdminUser currentAdmin = adminUserService.getAdminByEmail(principal.getName());
        ResidentUser resident = residentUserService.getResidentById(id);

        if (resident == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "message", "Resident not found"));
        }

        resident.setStatus("ACTIVE");
        residentUserService.saveResident(resident);

        activityLogService.log(
            currentAdmin.getName(), currentAdmin.getRole(), "RESTORED", "Accounts",
            "Restored the resident account of " + resident.getFirstName() + " " + resident.getLastName(),
            request.getRemoteAddr(), "Success"
        );

        lastAccountsModificationTime = System.currentTimeMillis();
        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/accounts/api/poll")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> pollAccounts() {
        Map<String, Object> response = new HashMap<>();
        
        response.put("lastModified", lastAccountsModificationTime);
        
        List<AdminUserDTO> allAdmins = adminUserService.getAllAdminsForTable();
        
        List<Map<String, Object>> activeEmployees = allAdmins.stream()
            .filter(a -> !"Archived".equalsIgnoreCase(a.empstatus()))
            .map(this::mapAdminToPollResponse)
            .collect(Collectors.toList());
        
        List<Map<String, Object>> archivedEmployees = allAdmins.stream()
            .filter(a -> "Archived".equalsIgnoreCase(a.empstatus()))
            .map(this::mapAdminToPollResponse)
            .collect(Collectors.toList());
        
        response.put("employeeAccounts", activeEmployees);
        response.put("archivedEmployeeAccounts", archivedEmployees);
        
        List<ResidentDTO> allResidents = residentUserService.getAllResidentsDTO();
        
        List<Map<String, Object>> activeResidents = allResidents.stream()
            .filter(r -> !"Archived".equalsIgnoreCase(r.status()))
            .map(this::mapResidentToPollResponse)
            .collect(Collectors.toList());
        
        List<Map<String, Object>> archivedResidents = allResidents.stream()
            .filter(r -> "Archived".equalsIgnoreCase(r.status()))
            .map(this::mapResidentToPollResponse)
            .collect(Collectors.toList());
        
        response.put("residentAccounts", activeResidents);
        response.put("archivedResidentAccounts", archivedResidents);
        
        response.put("emailList", adminUserService.extractEmails(allAdmins));
        response.put("usernameList", adminUserService.extractUsernames(allAdmins));
        response.put("phoneList", adminUserService.extractPhoneNumbers(allAdmins));
        
        return ResponseEntity.ok(response);
    }

    private Map<String, Object> mapAdminToPollResponse(AdminUserDTO admin) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", admin.id());
        map.put("employeeId", admin.employeeId());
        map.put("firstName", admin.firstName());
        map.put("lastName", admin.lastName());
        map.put("username", admin.username());
        map.put("email", admin.email());
        map.put("role", admin.role());
        map.put("gender", admin.gender());
        map.put("birthDate", admin.birthDate() != null ? admin.birthDate().toString() : "");
        map.put("address", admin.address());
        map.put("phoneNumber", admin.phoneNumber());
        map.put("empstatus", admin.empstatus());
        map.put("profilePicture", admin.profilePicture());
        return map;
    }

    private Map<String, Object> mapResidentToPollResponse(ResidentDTO resident) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", resident.id() != null ? resident.id().toString() : "");
        map.put("residentId", resident.residentId());
        map.put("firstName", resident.firstName());
        map.put("lastName", resident.lastName());
        map.put("gender", resident.gender());
        map.put("birthDate", resident.birthDate() != null ? resident.birthDate().toString() : "");
        map.put("mobileNumber", resident.mobileNumber());
        map.put("email", resident.email());
        map.put("address", resident.address());
        map.put("accountStatus", resident.account_status() != null ? resident.account_status() : "UNVERIFIED");
        map.put("selfie", resident.selfie());
        map.put("validId", resident.validId());
        map.put("barangayIndigency", resident.barangayIndigency());
        map.put("avatarUrl", resident.avatar_url());
        map.put("status", resident.status());
        return map;
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
        if ("TANOD".equalsIgnoreCase(admin.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Tanod accounts can only log in through the mobile app.");
        }
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

        model.addAttribute("currentUser", admin.getName());
        model.addAttribute("currentrole", role);
        model.addAttribute("currentstatus", admin.getEmpstatus());
        model.addAttribute("currentAdminProfilePicture", admin.getProfilePicture());
        model.addAttribute("currentAdminId", admin.getId());

        // Archived check happens before we spend any time firing off
        // queries — no point running ten DB calls just to redirect away.
        if ("Archived".equalsIgnoreCase(admin.getEmpstatus())) {
            return "redirect:/logout";
        }

        ExecutorService ex = dashboardQueryExecutor;

        // ── Fire every independent query concurrently ──────────────────
        // Each future carries its own try/catch so a single failing
        // service can't take down the others — same fallback values as
        // the original sequential version, just computed off the main
        // request thread.

        CompletableFuture<Map<String, Object>> demoDataFuture = CompletableFuture.supplyAsync(() -> {
            try {
                return censusRecordService.getDetailedDemographics();
            } catch (Exception e) {
                System.err.println("Error loading census demographics: " + e.getMessage());
                return null; // signal fallback below
            }
        }, ex);

        CompletableFuture<Long> residentsFuture = CompletableFuture.supplyAsync(() -> {
            try {
                return residentUserService.countResidents();
            } catch (Exception e) {
                return 0L;
            }
        }, ex);

        CompletableFuture<Long> blotterCountFuture = CompletableFuture.supplyAsync(() -> {
            try {
                return blotterService.countAll();
            } catch (Exception e) {
                return 0L;
            }
        }, ex);

        CompletableFuture<Long> pendingBlottersFuture = CompletableFuture.supplyAsync(() -> {
            try {
                long processing = blotterService.countByStatus("PROCESSING");
                long ready = blotterService.countByStatus("READY");
                return processing + ready;
            } catch (Exception e) {
                return 0L;
            }
        }, ex);

        CompletableFuture<Announcements> latestAnnouncementFuture = CompletableFuture.supplyAsync(() -> {
            try {
                return announcementsService.getLatest();
            } catch (Exception e) {
                return null;
            }
        }, ex);

        CompletableFuture<Long> pendingDocumentsFuture = CompletableFuture.supplyAsync(() -> {
            try {
                return documentService.countPending();
            } catch (Exception e) {
                return 0L;
            }
        }, ex);

        CompletableFuture<Double> budgetFuture = CompletableFuture.supplyAsync(() -> {
            try {
                return programBudgetService.getTotalBudget();
            } catch (Exception e) {
                return 0.0;
            }
        }, ex);

        CompletableFuture<Long> newRequestsFuture = CompletableFuture.supplyAsync(() -> {
            try {
                return documentService.countThisMonth();
            } catch (Exception e) {
                return 0L;
            }
        }, ex);

        CompletableFuture<List<Activitylogs>> recentLogsFuture = CompletableFuture.supplyAsync(() -> {
            try {
                return activityLogService.getRecentLogs(5);
            } catch (Exception e) {
                return new ArrayList<Activitylogs>();
            }
        }, ex);

        CompletableFuture<Long> sosAlertsFuture = CompletableFuture.supplyAsync(() -> {
            try {
                return sosService.countThisMonth();
            } catch (Exception e) {
                return 0L;
            }
        }, ex);

        CompletableFuture<Map<String, Long>> safetyStatsFuture = CompletableFuture.supplyAsync(() -> {
            try {
                return safetyReportService.getStatusCounts();
            } catch (Exception e) {
                return null; // signal fallback below
            }
        }, ex);

        // ── Wait for everything to resolve ──────────────────────────────
        // The wall-clock cost here is roughly the duration of the single
        // slowest query, not the sum of all ten — this is where the TTFB
        // win comes from.
        CompletableFuture.allOf(
            demoDataFuture, residentsFuture, blotterCountFuture, pendingBlottersFuture,
            latestAnnouncementFuture, pendingDocumentsFuture, budgetFuture,
            newRequestsFuture, recentLogsFuture, sosAlertsFuture, safetyStatsFuture
        ).join();

        // ── Populate the model — same attribute names/defaults as before ──

        Map<String, Object> demoData = demoDataFuture.join();
        if (demoData != null) {
            model.addAttribute("householdCount", demoData.getOrDefault("householdCount", 0));
            model.addAttribute("childrenCount", demoData.getOrDefault("childrenCount", 0));
            model.addAttribute("adultMalesCount", demoData.getOrDefault("adultMalesCount", 0));
            model.addAttribute("adultFemalesCount", demoData.getOrDefault("adultFemalesCount", 0));
            model.addAttribute("seniorsCount", demoData.getOrDefault("seniorsCount", 0));
            model.addAttribute("totalResidents", demoData.getOrDefault("totalResidents", 0));
            model.addAttribute("pwdCount", demoData.getOrDefault("pwdCount", 0));
            model.addAttribute("pwdChildren", demoData.getOrDefault("pwdChildren", 0));
            model.addAttribute("pwdAdultMales", demoData.getOrDefault("pwdAdultMales", 0));
            model.addAttribute("pwdAdultFemales", demoData.getOrDefault("pwdAdultFemales", 0));
            model.addAttribute("pwdSeniors", demoData.getOrDefault("pwdSeniors", 0));
            model.addAttribute("seniorMaleCount", demoData.getOrDefault("seniorMaleCount", 0));
            model.addAttribute("seniorFemaleCount", demoData.getOrDefault("seniorFemaleCount", 0));
        } else {
            model.addAttribute("householdCount", 0);
            model.addAttribute("childrenCount", 0);
            model.addAttribute("adultMalesCount", 0);
            model.addAttribute("adultFemalesCount", 0);
            model.addAttribute("seniorsCount", 0);
            model.addAttribute("totalResidents", 0);
            model.addAttribute("pwdCount", 0);
            model.addAttribute("pwdChildren", 0);
            model.addAttribute("pwdAdultMales", 0);
            model.addAttribute("pwdAdultFemales", 0);
            model.addAttribute("pwdSeniors", 0);
            model.addAttribute("seniorMaleCount", 0);
            model.addAttribute("seniorFemaleCount", 0);
        }

        model.addAttribute("residents", residentsFuture.join());
        model.addAttribute("blotterCount", blotterCountFuture.join());
        model.addAttribute("blotterPending", pendingBlottersFuture.join());
        model.addAttribute("latestAnnouncement", latestAnnouncementFuture.join());
        model.addAttribute("pendingDocuments", pendingDocumentsFuture.join());
        model.addAttribute("budget", budgetFuture.join());
        model.addAttribute("newRequestsThisMonth", newRequestsFuture.join());
        model.addAttribute("recentLogs", recentLogsFuture.join());
        model.addAttribute("sosAlertsThisMonth", sosAlertsFuture.join());

        Map<String, Long> safetyStats = safetyStatsFuture.join();
        if (safetyStats != null) {
            long resolved = safetyStats.getOrDefault("resolved", 0L) + safetyStats.getOrDefault("arch-resolved", 0L);
            long arch = safetyStats.getOrDefault("archived", 0L);
            long inProgress = safetyStats.getOrDefault("in progress", 0L);
            long unverified = safetyStats.getOrDefault("unverified", 0L);
            long approved = safetyStats.getOrDefault("approved", 0L);

            long allUnresolved = arch + inProgress + unverified + approved;
            long allReports = resolved + allUnresolved;

            model.addAttribute("resolvedIncidents", resolved);
            model.addAttribute("unresolvedIncidents", allUnresolved);
            model.addAttribute("allreports", allReports);
        } else {
            model.addAttribute("resolvedIncidents", 0L);
            model.addAttribute("unresolvedIncidents", 0L);
            model.addAttribute("allreports", 0L);
        }

    } else {
        model.addAttribute("currentUser", "Admin");
        model.addAttribute("currentrole", "USER");
        model.addAttribute("currentstatus", "Unknown");
        model.addAttribute("currentAdminProfilePicture", "");
        model.addAttribute("currentAdminId", null);
        model.addAttribute("householdCount", 0);
        model.addAttribute("childrenCount", 0);
        model.addAttribute("adultMalesCount", 0);
        model.addAttribute("adultFemalesCount", 0);
        model.addAttribute("seniorsCount", 0);
        model.addAttribute("totalResidents", 0);
        model.addAttribute("pwdCount", 0);
        model.addAttribute("pwdChildren", 0);
        model.addAttribute("pwdAdultMales", 0);
        model.addAttribute("pwdAdultFemales", 0);
        model.addAttribute("pwdSeniors", 0);
        model.addAttribute("seniorMaleCount", 0);
        model.addAttribute("seniorFemaleCount", 0);
        model.addAttribute("residents", 0L);
        model.addAttribute("blotterCount", 0L);
        model.addAttribute("blotterPending", 0L);
        model.addAttribute("latestAnnouncement", null);
        model.addAttribute("pendingDocuments", 0L);
        model.addAttribute("budget", 0.0);
        model.addAttribute("newRequestsThisMonth", 0L);
        model.addAttribute("recentLogs", new ArrayList<>());
        model.addAttribute("sosAlertsThisMonth", 0L);
        model.addAttribute("resolvedIncidents", 0L);
        model.addAttribute("unresolvedIncidents", 0L);
        model.addAttribute("allreports", 0L);
    }

    model.addAttribute("newAdmin", new AdminUser());
    return "Dashboard";
}

        @GetMapping("/api/dashboard/notifications")
        @ResponseBody
        public ResponseEntity<?> getNotifications(@RequestParam(defaultValue = "false") boolean countOnly) {
            
            List<Map<String, Object>> notifications = new ArrayList<>();
            
            try {
                long pendingDocuments = documentService.countPending();
                if (pendingDocuments > 0) {
                    notifications.add(createNotification(
                        "bi-file-earmark-text", "documents",
                        "Document Requests", 
                        pendingDocuments + " pending document request(s) waiting for approval",
                        "/requests-document"
                    ));
                }
            } catch (Exception e) {}
            
            try {
                Map<String, Long> safetyStats = safetyReportService.getStatusCounts();
                long incomingReports = safetyStats.getOrDefault("unverified", 0L);
                
                System.out.println("Safety Reports - incoming count: " + incomingReports);
                
                if (incomingReports > 0) {
                    notifications.add(createNotification(
                        "bi-shield-exclamation", "safety",
                        "📋 Safety Reports",
                        incomingReports + " incoming safety report(s) need review",
                        "/safety-reports?tab=incoming"
                    ));
                }
            } catch (Exception e) {
                System.err.println("Error getting safety reports: " + e.getMessage());
                e.printStackTrace();
            }
            
            try {
                long incomingSosCount = sosService.countByStatus("INCOMING");
                if (incomingSosCount > 0) {
                    notifications.add(createNotification(
                        "bi-exclamation-triangle-fill", "emergency",
                        "⚠️ SOS Alerts",
                        incomingSosCount + " incoming SOS alert(s) need immediate attention",
                        "/sos-monitoring?tab=incoming"
                    ));
                }
            } catch (Exception e) {
                System.err.println("Error getting SOS alerts: " + e.getMessage());
            }
            
            try {
                var latestAnnouncement = announcementsService.getLatest();
                if (latestAnnouncement != null && latestAnnouncement.getTitle() != null) {
                    String title = latestAnnouncement.getTitle();
                    if (title.length() > 40) title = title.substring(0, 37) + "...";
                    notifications.add(createNotification(
                        "bi-megaphone-fill", "announcements",
                        "Latest Announcement",
                        title,
                        "/announcements"
                    ));
                }
            } catch (Exception e) {}
            
            try {
                List<ResidentDTO> allResidents = residentUserService.getAllResidentsDTO();
                long unverifiedResidents = allResidents.stream()
                    .filter(r -> "UNVERIFIED".equalsIgnoreCase(r.account_status()))
                    .filter(r -> !"Archived".equalsIgnoreCase(r.status()))
                    .count();
                
                if (unverifiedResidents > 0) {
                    notifications.add(createNotification(
                        "bi-person-check-fill", "accounts",
                        "Pending Verifications",
                        unverifiedResidents + " resident(s) waiting for account verification",
                        "/account"
                    ));
                }
            } catch (Exception e) {}
            
            try {
                java.time.LocalDate today = java.time.LocalDate.now();
                var allEvents = programCalendarService.getAllEvents();
                long upcomingPrograms = allEvents.stream()
                    .filter(e -> e.getEventDate() != null)
                    .filter(e -> !e.getEventDate().isBefore(today))
                    .count();
                
                if (upcomingPrograms > 0) {
                    notifications.add(createNotification(
                        "bi-calendar-event-fill", "programs",
                        "Upcoming Programs",
                        upcomingPrograms + " upcoming program(s) scheduled",
                        "/program-calendar"
                    ));
                }
            } catch (Exception e) {
                System.err.println("Error getting programs: " + e.getMessage());
            }

            try {
                List<ContactHelpRequest> incomingContacts = contactHelpService.getRequestsByStatus("INCOMING");
                long incomingCount = incomingContacts.size();
                
                if (incomingCount > 0) {
                    notifications.add(createNotification(
                        "bi-chat-dots-fill", "accounts",
                        "Contact Help",
                        incomingCount + " new message(s) from residents",
                        "/contact-help?tab=incoming"
                    ));
                }
            } catch (Exception e) {
            }

            try {
                rentalService.updateOverdueStatus();
                int overdueRentals = rentalService.getOverdueRentals().size();
                if (overdueRentals > 0) {
                    notifications.add(createNotification(
                        "bi-calendar-x-fill", "safety",
                        "Overdue Rentals",
                        overdueRentals + " rental(s) are past their return date",
                        "/rentals?tab=overdue"
                    ));
                }
            } catch (Exception e) {
                System.err.println("Error getting overdue rentals: " + e.getMessage());
            }

            try {
                java.time.LocalDate today = java.time.LocalDate.now();
                long dueSoon = rentalService.getActiveRentals().stream()
                    .filter(r -> r.getExpectedReturnDate() != null)
                    .filter(r -> {
                        long days = java.time.temporal.ChronoUnit.DAYS.between(today, r.getExpectedReturnDate());
                        return days >= 0 && days <= 2;
                    })
                    .count();
                if (dueSoon > 0) {
                    notifications.add(createNotification(
                        "bi-calendar-check-fill", "documents",
                        "Rentals Due Soon",
                        dueSoon + " active rental(s) are due within 2 days",
                        "/rentals?tab=active"
                    ));
                }
            } catch (Exception e) {
                System.err.println("Error getting due-soon rentals: " + e.getMessage());
            }

            if (countOnly) {
                return ResponseEntity.ok(Map.of("count", (long) notifications.size()));
            }
            
            if (notifications.isEmpty()) {
                notifications.add(createNotification(
                    "bi-check-circle-fill", "programs",
                    "All Clear",
                    "No pending items requiring your attention",
                    "#"
                ));
            }
            
            return ResponseEntity.ok(notifications);
        }

        @GetMapping("/api/sidebar/counts")
        @ResponseBody
        public ResponseEntity<Map<String, Integer>> getSidebarCounts(Principal principal) {
            Map<String, Integer> counts = new HashMap<>();

            try {
                counts.put("announcements", (int) announcementsService.countActive());
            } catch (Exception e) { counts.put("announcements", 0); }

            try {
                long unverified = residentUserService.getAllResidentsDTO().stream()
                    .filter(r -> "UNVERIFIED".equalsIgnoreCase(r.account_status()))
                    .filter(r -> !"Archived".equalsIgnoreCase(r.status()))
                    .count();
                counts.put("accounts", (int) unverified);
            } catch (Exception e) { counts.put("accounts", 0); }

            try {
                int pending  = (int) documentService.countPending();
                int blotters = blotterService.getByStatus("PROCESSING").size()
                            + blotterService.getByStatus("READY").size();
                counts.put("requests",  pending + blotters);
                counts.put("documents", pending);
            } catch (Exception e) { counts.put("requests", 0); counts.put("documents", 0); }

            try {
                int blotters = blotterService.getByStatus("PROCESSING").size()
                            + blotterService.getByStatus("READY").size();
                counts.put("blotter", blotters);
            } catch (Exception e) { counts.put("blotter", 0); }

            counts.put("facilities", 0);

            try {
                Map<String, Long> safetyStats = safetyReportService.getStatusCounts();
                int active = (int)(
                    safetyStats.getOrDefault("incoming",    0L) +
                    safetyStats.getOrDefault("in progress", 0L) +
                    safetyStats.getOrDefault("approved",    0L)
                );
                counts.put("safety-reports", active);
            } catch (Exception e) { counts.put("safety-reports", 0); }

            try {
                counts.put("sos", (int) sosService.countByStatus("INCOMING"));
            } catch (Exception e) { counts.put("sos", 0); }

            try {
                java.time.LocalDate today = java.time.LocalDate.now();
                int upcoming = (int) programCalendarService.getAllEvents().stream()
                    .filter(e -> e.getEventDate() != null)
                    .filter(e -> !e.getEventDate().isBefore(today))
                    .count();
                counts.put("programs", upcoming);
            } catch (Exception e) { counts.put("programs", 0); }

            counts.put("activity-logs", 0);

            return ResponseEntity.ok(counts);
        }

        private Map<String, Object> createNotification(String icon, String iconClass, String title, String description, String link) {
            Map<String, Object> n = new HashMap<>();
            n.put("icon", icon);
            n.put("iconClass", iconClass);
            n.put("title", title);
            n.put("description", description);
            n.put("link", link);
            n.put("timeAgo", "Now");
            return n;
        }

        
        @GetMapping("/api/debug/safety-stats")
        @ResponseBody
        public ResponseEntity<?> debugSafetyStats() {
            Map<String, Long> safetyStats = safetyReportService.getStatusCounts();
            return ResponseEntity.ok(safetyStats);
        }

    @GetMapping("/program-calendar")
    public String ProgramCalendarPage(Principal principal, Model model) {
        AdminUser admin = addCurrentAdminToModel(principal, model);

        System.out.println(admin.getRole());
        model.addAttribute("newAdmin", new AdminUser());

        Set<String> allowedRoles = Set.of("ADMIN", "SECRETARY", "BARANGAY-CAPTAIN", "TREASURER", "SECRETARIAT STAFF");

        if (!allowedRoles.contains(admin.getRole())) {
            return "redirect:/home";
        }
        if ("Archived".equalsIgnoreCase(admin.getEmpstatus())) {
                return "redirect:/logout";
            }
        return "ProgramCalendar";
    }

    @GetMapping("/program-planner")
    public String ProgramPlannerPage(Principal principal, Model model) {
        AdminUser admin = addCurrentAdminToModel(principal, model);
        model.addAttribute("newAdmin", new AdminUser());

        Set<String> allowedRoles = Set.of("ADMIN", "SECRETARY", "BARANGAY-CAPTAIN", "TREASURER", "SECRETARIAT STAFF");

        if (!allowedRoles.contains(admin.getRole())) {
            return "redirect:/home";
        }
        if ("Archived".equalsIgnoreCase(admin.getEmpstatus())) {
                return "redirect:/logout";
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
            @RequestParam(defaultValue = "300") int size) {

        AdminUser currentAdmin = addCurrentAdminToModel(principal, model);

        Set<String> allowedRoles = Set.of("ADMIN", "SECRETARY", "SECRETARIAT STAFF");

        if (currentAdmin == null || !allowedRoles.contains(currentAdmin.getRole())) {
            return "redirect:/home";
        }
        if ("Archived".equalsIgnoreCase(currentAdmin.getEmpstatus())) {
                return "redirect:/logout";
            }
        model.addAttribute("newAdmin", new AdminUser());

        org.springframework.data.domain.Page<Activitylogs> logsPage =
            activityLogService.getLogsPaginated(page, size);

        model.addAttribute("activityLogs", logsPage.getContent());
        model.addAttribute("currentPage",  page);
        model.addAttribute("totalPages",   logsPage.getTotalPages());

        return "ActivityLogs";
    }
    @GetMapping("/Activity-logs/api/poll")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> pollActivityLogs() {
        Map<String, Object> response = new HashMap<>();
        org.springframework.data.domain.Page<Activitylogs> latestPage = 
            activityLogService.getLogsPaginated(0, 1);
        if (!latestPage.getContent().isEmpty()) {
            Activitylogs latest = latestPage.getContent().get(0);
            response.put("lastId", latest.getId());
            response.put("lastTimestamp", latest.getTimestamp() != null ? latest.getTimestamp().toString() : "");
        } else {
            response.put("lastId", 0);
            response.put("lastTimestamp", "");
        }
        return ResponseEntity.ok(response);
    }

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
                System.out.println("DEBUG: Sending temporary password to " + fullName);
                emailService.sendGeneratedPassword(email, tempPassword, fullName);
            } catch (Exception e) {
                System.err.println("Failed to send email: " + e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("message", "Password was reset but failed to send email. Please contact your administrator."));
            }

            return ResponseEntity.ok(Map.of("message", "Temporary password sent successfully. Please check your email."));
        }

        @GetMapping("/api/census/demographics")
        @ResponseBody
        public ResponseEntity<Map<String, Object>> getCensusDemographics() {
            try {
                Map<String, Object> demographics = censusRecordService.getDetailedDemographics();
                return ResponseEntity.ok(demographics);
            } catch (Exception e) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
            }

        }

            @PostMapping("/system-logs/request-assistance")
            @ResponseBody
            public ResponseEntity<Map<String, Object>> requestAssistance(
                    @RequestParam String message,
                    Principal principal,
                    HttpServletRequest request) {

                Map<String, Object> response = new HashMap<>();

                if (message == null || message.isBlank()) {
                    response.put("success", false);
                    response.put("message", "Message cannot be empty.");
                    return ResponseEntity.badRequest().body(response);
                }

                AdminUser currentAdmin = adminUserService.getAdminByEmail(principal.getName());
                if (currentAdmin == null) {
                    response.put("success", false);
                    response.put("message", "Could not identify requester.");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
                }

                systemLogsService.saveAssistanceRequest(
                    currentAdmin.getId(),
                    currentAdmin.getName(),
                    currentAdmin.getRole(),
                    message.trim()
                );

                activityLogService.log(
                    currentAdmin.getName(), currentAdmin.getRole(), "REQUESTED", "Accounts",
                    truncate("Requested admin assistance — " + message.trim()),
                    request.getRemoteAddr(), "Success"
                );

                response.put("success", true);
                return ResponseEntity.ok(response);
            }

            @GetMapping("/system-logs/api/pending")
            @ResponseBody
            public ResponseEntity<List<Map<String, Object>>> getPendingAssistanceRequests() {
                List<Map<String, Object>> pending = systemLogsService.getPendingAssistanceRequests()
                    .stream()
                    .map(log -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", log.getId());
                        map.put("requesterName", log.getRequesterName());
                        map.put("requesterRole", log.getRequesterRole());
                        map.put("description", log.getDescription());
                        map.put("timestamp", log.getTimestamp() != null ? log.getTimestamp().toString() : "");
                        return map;
                    })
                    .collect(Collectors.toList());

                return ResponseEntity.ok(pending);
            }

            @PostMapping("/system-logs/resolve/{id}")
            @ResponseBody
            public ResponseEntity<Map<String, Object>> resolveAssistanceRequest(
                    @PathVariable Long id,
                    Principal principal,
                    HttpServletRequest request) {

                Map<String, Object> response = new HashMap<>();
                AdminUser currentAdmin = adminUserService.getAdminByEmail(principal.getName());

                String requestSummary = systemLogsService.getPendingAssistanceRequests().stream()
                        .filter(log -> log.getId().equals(id))
                        .findFirst()
                        .map(log -> log.getRequesterName() + " (" + log.getRequesterRole() + "): " + log.getDescription())
                        .orElse("request #" + id);

                systemLogsService.resolveAssistanceRequest(id);

                if (currentAdmin != null) {
                    activityLogService.log(
                        currentAdmin.getName(), currentAdmin.getRole(), "RESOLVED", "Accounts",
                        truncate("Resolved assistance request — " + requestSummary),
                        request.getRemoteAddr(), "Success"
                    );
                }

                response.put("success", true);
                return ResponseEntity.ok(response);
            }
}