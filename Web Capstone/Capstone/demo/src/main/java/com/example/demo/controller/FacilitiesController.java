package com.example.demo.controller;

import com.example.demo.model.AdminUser;
import com.example.demo.model.Facilities;
import com.example.demo.services.ActivityLogService;
import com.example.demo.services.AdminUserServices;
import com.example.demo.services.FacilitiesService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/facilities")
public class FacilitiesController {

    @Autowired
    private FacilitiesService facilitiesService;

    @Autowired
    private AdminUserServices adminUserService;

    @Autowired
    private ActivityLogService activityLogService;

    @GetMapping
    public String viewFacilities(
            @RequestParam(defaultValue = "police") String tab,
            Principal principal,
            Model model) {

        String username = principal.getName();
        AdminUser admin = adminUserService.getAdminByEmail(username);
                if ("Archived".equalsIgnoreCase(admin.getEmpstatus())) {
                return "redirect:/logout";
            }
        model.addAttribute("newAdmin", new AdminUser());
        model.addAttribute("currentUser", admin.getName());
        model.addAttribute("currentrole", admin.getRole());
        Set<String> allowedRoles = Set.of("ADMIN", "SECRETARY", "BARANGAY-CAPTAIN", "TREASURER");
        if (!allowedRoles.contains(admin.getRole())) return "redirect:/home";

        List<Facilities> allFacilities = facilitiesService.getAllFacilities();

        model.addAttribute("policeFacilities",    allFacilities.stream().filter(f -> "POLICE".equals(f.getFacilityType())).collect(Collectors.toList()));
        model.addAttribute("fireFacilities",      allFacilities.stream().filter(f -> "FIRE".equals(f.getFacilityType())).collect(Collectors.toList()));
        model.addAttribute("hospitalFacilities",  allFacilities.stream().filter(f -> "HOSPITAL".equals(f.getFacilityType())).collect(Collectors.toList()));
        model.addAttribute("emergencyFacilities", allFacilities.stream().filter(f -> "EMERGENCY".equals(f.getFacilityType())).collect(Collectors.toList()));
        model.addAttribute("currentTab", tab);

        return "Facilities";
    }

    @GetMapping("/{id}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getFacility(@PathVariable Long id) {
        Facilities facility = facilitiesService.getFacilityById(id);
        if (facility == null) {
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("id", facility.getId());
        response.put("facilityName",   facility.getFacilityName()   != null ? facility.getFacilityName()   : "N/A");
        response.put("facilityType",   facility.getFacilityType()   != null ? facility.getFacilityType()   : "N/A");
        response.put("contactNumber",  facility.getContactNumber()  != null ? facility.getContactNumber()  : "N/A");
        response.put("email",          facility.getEmail()          != null ? facility.getEmail()          : "N/A");
        response.put("address",        facility.getAddress()        != null ? facility.getAddress()        : "N/A");
        response.put("status",         facility.getStatus()         != null ? facility.getStatus()         : "N/A");
        response.put("createdAt",      facility.getCreatedAt()      != null ? facility.getCreatedAt().toString() : null);
        response.put("updatedAt",      facility.getUpdatedAt()      != null ? facility.getUpdatedAt().toString() : null);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/add")
    @ResponseBody
    public ResponseEntity<?> addFacility(
            @RequestBody Facilities facility,
            Principal principal,
            HttpServletRequest request) {

        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
        Facilities saved = facilitiesService.saveFacility(facility);

        activityLogService.log(
            principal.getName(), admin.getRole(), "CREATED", "Facilities",
            "Added a new " + saved.getFacilityType().toLowerCase() + " facility: \"" + saved.getFacilityName() + "\"",
            request.getRemoteAddr(), "Success"
        );

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Facility added successfully");
        response.put("id", saved.getId());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @ResponseBody
    public ResponseEntity<?> updateFacility(
            @PathVariable Long id,
            @RequestBody Facilities facility,
            Principal principal,
            HttpServletRequest request) {

        Facilities existing = facilitiesService.getFacilityById(id);
        if (existing == null) {
            activityLogService.log(
                    principal.getName(), "ADMIN", "UPDATED", "Facilities",
                    "Tried to edit facility #" + id + " but it was not found",
                    request.getRemoteAddr(), "Failed"
                );
            return ResponseEntity.notFound().build();
        }

        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());

        existing.setFacilityName(facility.getFacilityName());
        existing.setFacilityType(facility.getFacilityType());
        existing.setContactNumber(facility.getContactNumber());
        existing.setEmail(facility.getEmail());
        existing.setAddress(facility.getAddress());
        existing.setStatus(facility.getStatus());
        existing.setLatitude(facility.getLatitude());
        existing.setLongitude(facility.getLongitude());

        facilitiesService.saveFacility(existing);

        activityLogService.log(
            principal.getName(), admin.getRole(), "UPDATED", "Facilities",
            "Updated facility details for \"" + existing.getFacilityName() + "\"",
            request.getRemoteAddr(), "Success"
        );

        Map<String, String> response = new HashMap<>();
        response.put("message", "Facility updated successfully");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @ResponseBody
    public ResponseEntity<?> deleteFacility(
            @PathVariable Long id,
            Principal principal,
            HttpServletRequest request) {

        Facilities existing = facilitiesService.getFacilityById(id);
        if (existing == null) {
            activityLogService.log(
                    principal.getName(), "ADMIN", "DELETED", "Facilities",
                    "Tried to delete facility #" + id + " but it was not found",
                    request.getRemoteAddr(), "Failed"
                );
            return ResponseEntity.notFound().build();
        }

        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
        String facilityName = existing.getFacilityName();

        facilitiesService.deleteFacility(id);

            activityLogService.log(
                principal.getName(), admin.getRole(), "DELETED", "Facilities",
                "Removed the facility: \"" + facilityName + "\"",
                request.getRemoteAddr(), "Success"
            );

        Map<String, String> response = new HashMap<>();
        response.put("message", "Facility deleted successfully");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/poll")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> pollFacilities() {
        Map<String, Object> response = new HashMap<>();
        List<Facilities> all = facilitiesService.getAllFacilities();
        
        response.put("police",    all.stream().filter(f -> "POLICE".equals(f.getFacilityType())).count());
        response.put("fire",      all.stream().filter(f -> "FIRE".equals(f.getFacilityType())).count());
        response.put("hospital",  all.stream().filter(f -> "HOSPITAL".equals(f.getFacilityType())).count());
        response.put("emergency", all.stream().filter(f -> "EMERGENCY".equals(f.getFacilityType())).count());
        
        return ResponseEntity.ok(response);
    }
}