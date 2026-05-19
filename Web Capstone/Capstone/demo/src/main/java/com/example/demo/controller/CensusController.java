package com.example.demo.controller;

import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import com.example.demo.repository.CensusRecordRepository;
import com.example.demo.dto.CensusRecordDTO;
import com.example.demo.dto.CensusView;
import com.example.demo.model.AdminUser;
import com.example.demo.model.CensusRecord;
import com.example.demo.services.ActivityLogService;
import com.example.demo.services.AdminUserServices;
import com.example.demo.services.CensusRecordService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.security.Principal;
import java.util.List;

@Controller
@RequestMapping("/Resident-census")
public class CensusController {

    @Autowired private CensusRecordService censusService;
    @Autowired private CensusRecordRepository censusRepo;
    @Autowired private AdminUserServices   adminUserService;
    @Autowired private ActivityLogService  activityLogService;

    // ── GET /Resident-census ──────────────────────────────────────

    @GetMapping
    public String censusPage(Principal principal, Model model) {
        AdminUser admin = getAdmin(principal);
        if (isArchived(admin)) return "redirect:/logout";

        List<CensusRecordDTO> active   = censusService.getAllActiveForTable();
        List<CensusRecordDTO> archived = censusService.getAllArchivedForTable();

        // ── TEMPORARY DEBUG — remove after fixing ──
        System.out.println("=== CENSUS DEBUG ===");
        System.out.println("Active count:   " + active.size());
        System.out.println("Archived count: " + archived.size());
        if (!active.isEmpty()) {
            CensusRecordDTO first = active.get(0);
            System.out.println("First record ID:        " + first.getId());
            System.out.println("First record firstName: " + first.getFirstName());
            System.out.println("First record status:    " + first.getCensusStatus());
        }
        String json = censusService.buildCensusJson(active, archived);
        System.out.println("JSON length: " + json.length());
        System.out.println("JSON preview: " + json.substring(0, Math.min(200, json.length())));
        System.out.println("====================");
        // ── END DEBUG ──

        addAdminAttrs(model, admin);
        model.addAttribute("activeRecords",   active);
        model.addAttribute("archivedRecords", archived);
        model.addAttribute("activeCount",     active.size());
        model.addAttribute("archivedCount",   archived.size());
        model.addAttribute("newRecord",       new CensusRecord());
        model.addAttribute("censusJson",      json);

        return "Census";
    }

    // ── GET /Resident-census/view/{id} ────────────────────────────

    @GetMapping("/view/{id}")
    public String viewRecord(@PathVariable Long id,
                             Principal principal, Model model) {
        AdminUser admin = getAdmin(principal);
        if (isArchived(admin)) return "redirect:/logout";

        CensusRecord record = censusService.getById(id);
        if (record == null) return "redirect:/Resident-census?error=notfound";

        addAdminAttrs(model, admin);
        model.addAttribute("record",         record);
        model.addAttribute("recordAge",      record.getAge());
        model.addAttribute("recordFullName", record.getFullName());
        return "CensusDetail";
    }

    // ── POST /Resident-census/save ────────────────────────────────

    @PostMapping("/save")
    public String saveRecord(@ModelAttribute("record") CensusRecord record,
                             @RequestParam(value = "isEdit", defaultValue = "false") boolean isEdit,
                             Principal principal,
                             HttpServletRequest request,
                             RedirectAttributes redirectAttrs) {
        AdminUser admin = getAdmin(principal);
        if (isArchived(admin)) return "redirect:/logout";

        try {
            CensusRecord saved = censusService.save(record);
            String verb = isEdit ? "updated" : "created";
            activityLogService.log(
                admin.getName(), admin.getRole(),
                isEdit ? "UPDATE" : "CREATE", "Census",
                verb + " census record: " + saved.getFullName()
                    + " (" + saved.getRecordId() + ")",
                request.getRemoteAddr(), "SUCCESS"
            );
            redirectAttrs.addFlashAttribute("successMessage",
                "Record " + verb + " successfully.");
        } catch (Exception e) {
            redirectAttrs.addFlashAttribute("errorMessage",
                "Failed to save record: " + e.getMessage());
        }
        return "redirect:/Resident-census";
    }

    // ── POST /Resident-census/archive/{id} ────────────────────────

    @PostMapping("/archive/{id}")
    public String archiveRecord(@PathVariable Long id,
                                Principal principal,
                                HttpServletRequest request,
                                RedirectAttributes redirectAttrs) {
        AdminUser admin = getAdmin(principal);
        if (isArchived(admin)) return "redirect:/logout";

        try {
            censusService.archive(id);
            activityLogService.log(
                admin.getName(), admin.getRole(),
                "ARCHIVE", "Census",
                "Archived census record ID: " + id,
                request.getRemoteAddr(), "SUCCESS"
            );
            redirectAttrs.addFlashAttribute("successMessage", "Record archived.");
        } catch (Exception e) {
            redirectAttrs.addFlashAttribute("errorMessage",
                "Failed to archive record: " + e.getMessage());
        }
        return "redirect:/Resident-census";
    }

    // ── POST /Resident-census/restore/{id} ────────────────────────

    @PostMapping("/restore/{id}")
    public String restoreRecord(@PathVariable Long id,
                                Principal principal,
                                HttpServletRequest request,
                                RedirectAttributes redirectAttrs) {
        AdminUser admin = getAdmin(principal);
        if (isArchived(admin)) return "redirect:/logout";

        try {
            censusService.restore(id);
            activityLogService.log(
                admin.getName(), admin.getRole(),
                "RESTORE", "Census",
                "Restored census record ID: " + id,
                request.getRemoteAddr(), "SUCCESS"
            );
            redirectAttrs.addFlashAttribute("successMessage", "Record restored.");
        } catch (Exception e) {
            redirectAttrs.addFlashAttribute("errorMessage",
                "Failed to restore record: " + e.getMessage());
        }
        return "redirect:/Resident-census";
    }

    // ── GET /Resident-census/household/{householdId} ──────────────

    @GetMapping("/household/{householdId}")
    @ResponseBody
    public List<CensusRecordDTO> getHouseholdMembers(@PathVariable String householdId) {
        return censusService.getHouseholdMembers(householdId);
    }

    // ── GET /Resident-census/search ───────────────────────────────

    @GetMapping("/search")
    public String searchRecords(@RequestParam(defaultValue = "") String q,
                                @RequestParam(defaultValue = "") String status,
                                Principal principal, Model model) {
        AdminUser admin = getAdmin(principal);
        if (isArchived(admin)) return "redirect:/logout";

        List<CensusRecordDTO> results;
        if (q.isBlank() && status.isBlank()) {
            results = censusService.getAllActiveForTable();
        } else if (!status.isBlank()) {
            results = censusService.filterByStatus(status);
        } else {
            // search() returns CensusView projections — map to DTO (no entity load)
            results = censusService.search(q).stream()
                .map(this::toDTO)
                .toList();
        }

        List<CensusRecordDTO> archived = censusService.getAllArchivedForTable();
        addAdminAttrs(model, admin);
        model.addAttribute("activeRecords",   results);
        model.addAttribute("archivedRecords", archived);
        model.addAttribute("activeCount",     results.size());
        model.addAttribute("archivedCount",   archived.size());
        model.addAttribute("newRecord",       new CensusRecord());
        model.addAttribute("censusJson",      censusService.buildCensusJson(results, archived));
        model.addAttribute("searchQuery",     q);
        model.addAttribute("statusFilter",    status);
        return "Census";
    }

    // ── Private helpers ───────────────────────────────────────────

    private AdminUser getAdmin(Principal principal) {
        return adminUserService.getAdminByEmail(principal.getName());
    }

    private boolean isArchived(AdminUser admin) {
        return "Archived".equalsIgnoreCase(admin.getEmpstatus());
    }

    private void addAdminAttrs(Model model, AdminUser a) {
        String fn   = a.getFirstName() != null ? a.getFirstName() : "";
        String ln   = a.getLastName()  != null ? a.getLastName()  : "";
        String full = (fn + " " + ln).trim();
        if (full.isEmpty()) full = a.getUsername();

        model.addAttribute("currentUser",           full);
        model.addAttribute("currentAdminFirstName", a.getFirstName());
        model.addAttribute("currentAdminLastName",  a.getLastName());
        model.addAttribute("currentAdminUsername",  a.getUsername());
        model.addAttribute("currentAdminEmail",     a.getEmail());
        model.addAttribute("currentAdminAddress",   a.getAddress());
        model.addAttribute("currentAdminGender",    a.getGender());
        model.addAttribute("currentAdminBirthDate", a.getBirthDate() != null
                ? a.getBirthDate().toString() : "");
        model.addAttribute("currentAdminPhone",     a.getPhoneNumber());
        model.addAttribute("currentAdminID",        a.getEmployeeId());
        model.addAttribute("currentAdminRole",      a.getRole());
        model.addAttribute("currentAdminNumericId", a.getId());
        model.addAttribute("currentAdminStatus",    a.getEmpstatus());
        model.addAttribute("currentrole",           a.getRole());

        String pic = a.getProfilePicture();
        if (pic != null && !pic.isBlank())
            model.addAttribute("currentAdminProfilePicture", pic);
    }

    @GetMapping("/api/priority-residents")
    @ResponseBody
    public ResponseEntity<List<Map<String, Object>>> getPriorityResidents() {
        List<CensusRecord> residents = censusRepo.findVerifiedPriorityResidents();
        List<Map<String, Object>> result = residents.stream().map(r -> {
            Map<String, Object> m = new java.util.HashMap<>();
            m.put("id",              r.getId());
            m.put("firstName",       r.getFirstName());
            m.put("lastName",        r.getLastName());
            m.put("address",         r.getAddress());
            m.put("latitude",        r.getLatitude());
            m.put("longitude",       r.getLongitude());
            m.put("isSeniorCitizen", r.isSeniorCitizen());
            m.put("isPwd",           r.isPwd());
            m.put("verificationStatus",        r.getAccountStatus());
            m.put("emergencyContactName",      r.getEmergencyContactName());
            m.put("emergencyContactNumber",    r.getEmergencyContactNumber());
            m.put("emergencyContactRelation",  r.getEmergencyContactRelation());
            return m;
        }).collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /**
     * Maps a CensusView projection to a CensusRecordDTO.
     * Used only by the search path — no entity load needed.
     *
     * Parameter order must exactly match the CensusRecordDTO constructor.
     */
    private CensusRecordDTO toDTO(CensusView v) {
        return new CensusRecordDTO(
            v.getId(), v.getRecordId(), v.getHouseholdId(),
            v.getFirstName(), v.getMiddleName(), v.getLastName(), v.getSuffix(),
            v.getGender(), v.getDateOfBirth(),
            v.getAddress(), v.getMobile(),
            v.getOccupation(),
            v.getAccountStatus(), v.getCensusStatus(),
            v.getGovernmentIdUrl(), v.getSelfieWithIdUrl(), v.getBirthCertificate(),
            v.getHouseholdRelation(), v.getHomeOwnership(),
            v.getEvacuationPriority(),
            v.isSeniorCitizen(), v.isPwd(),
            v.isSoloParent(), v.isRegisteredVoter(), v.is4psBeneficiary(),
            v.getEmergencyContactName(), v.getEmergencyContactNumber(),
            v.getEmergencyContactRelation(),                              // ★ ADDED
            v.getNationality(), v.getPlaceOfBirth(), v.getCivilStatus(),
            v.getReligion(), v.getBloodType(), v.getIdType(),
            v.getHoaMembership(), v.getHouseholdMemberCount(),
            v.getDwellingType(), v.getHouseholdMemberNames(),
            v.getEducationalAttainment(), v.getEmploymentStatus(),
            v.getMonthlyIncomeRange(), v.isIndigenousPeople(),
            v.getPrecinctNumber(), v.getMedicalHistory(),
            v.getPhilhealthId(), v.getPhilhealthCategory(),
            v.getBloodPressureHistory(), v.getVaccCovid19(),
            v.getVaccInfluenza(), v.getVaccHpv(), null, null
        );
    }
}