package com.example.demo.controller;

import com.example.demo.model.AdminUser;
import com.example.demo.model.EmergencyAlerts;
import com.example.demo.services.AdminUserServices;
import com.example.demo.services.ActivityLogService;
import com.example.demo.services.EmergencyAlertService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/emergency-alerts")
public class EmergencyAlertsController {

    @Autowired private EmergencyAlertService emergencyAlertService;
    @Autowired private AdminUserServices adminUserService;
    @Autowired private ActivityLogService activityLogService;

    @GetMapping
    public String viewEmergencyAlerts(
            @RequestParam(defaultValue = "create") String tab,
            Principal principal,
            Model model) {

        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());

        model.addAttribute("newAdmin",     new AdminUser());
        model.addAttribute("currentUser",  admin.getName());
        model.addAttribute("currentrole",  admin.getRole());

        List<EmergencyAlerts> all = emergencyAlertService.getAllAlerts();

        model.addAttribute("currentAlerts", all.stream()
                .filter(a -> !a.isArchived())
                .sorted((a, b) -> b.getDateCreated().compareTo(a.getDateCreated()))
                .collect(Collectors.toList()));

        model.addAttribute("archivedAlerts", all.stream()
                .filter(EmergencyAlerts::isArchived)
                .sorted((a, b) -> b.getDateCreated().compareTo(a.getDateCreated()))
                .collect(Collectors.toList()));

        model.addAttribute("currentTab", tab);
        return "EmergencyAlerts";
    }

    @GetMapping("/{id}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getAlert(@PathVariable UUID id) {
        EmergencyAlerts a = emergencyAlertService.getAlertById(id);
        if (a == null) return ResponseEntity.notFound().build();

        Map<String, Object> response = new HashMap<>();
        response.put("id",            a.getId());
        response.put("title",         a.getTitle()         != null ? a.getTitle()         : "N/A");
        response.put("message",       a.getMessage()       != null ? a.getMessage()       : "N/A");
        response.put("location",      a.getLocation()      != null ? a.getLocation()      : "N/A");
        response.put("type",          a.getType()          != null ? a.getType()          : "N/A");
        response.put("priority",      a.getPriority()      != null ? a.getPriority()      : "N/A");
        response.put("status",        a.getStatus()        != null ? a.getStatus()        : "N/A");
        response.put("dateCreated",   a.getDateCreated()   != null ? a.getDateCreated().toString() : null);
        response.put("archived",      a.isArchived());
        response.put("createdByName", a.getCreatedByName() != null ? a.getCreatedByName() : "N/A");
        response.put("createdByRole", a.getCreatedByRole() != null ? a.getCreatedByRole() : "N/A");
        response.put("latitude",      a.getLatitude());
        response.put("longitude",     a.getLongitude());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/create")
    @ResponseBody
    public ResponseEntity<?> createAlert(
            @RequestBody EmergencyAlerts alert,
            Principal principal,
            HttpServletRequest request) {

        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());

        alert.setStatus("ACTIVE");
        alert.assignCreator(admin);

        EmergencyAlerts saved = emergencyAlertService.saveAlert(alert);

        activityLogService.log(
            admin.getName(), admin.getRole(), "CREATED", "Emergency Alerts",
            truncate("Created emergency alert: " + saved.getTitle()
                + (saved.getType() != null ? " [" + saved.getType() + "]" : "")),
            request.getRemoteAddr(), "Success"
        );

        return ResponseEntity.ok(Map.of("message", "Alert created successfully", "id", saved.getId()));
    }

    @PutMapping("/{id}/archive")
    @ResponseBody
    public ResponseEntity<?> archiveAlert(
            @PathVariable UUID id,
            Principal principal,
            HttpServletRequest request) {

        EmergencyAlerts a = emergencyAlertService.getAlertById(id);
        if (a == null) return ResponseEntity.notFound().build();

        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());

        a.setArchived(true);
        a.setStatus("ARCHIVED");
        emergencyAlertService.saveAlert(a);

        activityLogService.log(
            admin.getName(), admin.getRole(), "ARCHIVED", "Emergency Alerts",
            truncate("Archived emergency alert: " + a.getTitle()),
            request.getRemoteAddr(), "Success"
        );

        return ResponseEntity.ok(Map.of("message", "Alert archived successfully"));
    }

    @DeleteMapping("/{id}")
    @ResponseBody
    public ResponseEntity<?> deleteAlert(
            @PathVariable UUID id,
            Principal principal,
            HttpServletRequest request) {

        EmergencyAlerts a = emergencyAlertService.getAlertById(id);
        if (a == null) return ResponseEntity.notFound().build();

        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());

        activityLogService.log(
            admin.getName(), admin.getRole(), "DELETED", "Emergency Alerts",
            truncate("Deleted emergency alert: " + a.getTitle()),
            request.getRemoteAddr(), "Success"
        );

        emergencyAlertService.deleteAlert(id);

        return ResponseEntity.ok(Map.of("message", "Alert deleted successfully"));
    }

    private String truncate(String text) {
        if (text == null) return null;
        return text.length() > 250 ? text.substring(0, 250) + "..." : text;
    }
}