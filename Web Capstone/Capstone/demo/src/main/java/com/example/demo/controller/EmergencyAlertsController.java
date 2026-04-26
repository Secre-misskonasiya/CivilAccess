package com.example.demo.controller;

import com.example.demo.model.AdminUser;
import com.example.demo.model.EmergencyAlerts;
import com.example.demo.services.AdminUserServices;
import com.example.demo.services.EmergencyAlertService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/emergency-alerts")
public class EmergencyAlertsController {

    @Autowired
    private EmergencyAlertService emergencyAlertService;
    
    @Autowired
    private AdminUserServices adminUserService;

    @GetMapping
    public String viewEmergencyAlerts(
            @RequestParam(defaultValue = "create") String tab,
            Principal principal,
            Model model) {
        
        // Get the logged-in user information
        String username = principal.getName();
        AdminUser admin = adminUserService.getAdminByEmail(username);
        
        String name = admin.getName();
        String role = admin.getRole();

        // Add user info to model
        model.addAttribute("newAdmin", new AdminUser());
        model.addAttribute("currentUser", name);
        model.addAttribute("currentrole", role);
        
        // Get all alerts
        List<EmergencyAlerts> allAlerts = emergencyAlertService.getAllAlerts();
        
        // Filter alerts by status
        List<EmergencyAlerts> currentAlerts = allAlerts.stream()
        .filter(a -> !a.isArchived())
        .sorted((a, b) -> b.getDateCreated().compareTo(a.getDateCreated()))
        .collect(Collectors.toList());

        List<EmergencyAlerts> archivedAlerts = allAlerts.stream()
        .filter(EmergencyAlerts::isArchived)
        .sorted((a, b) -> b.getDateCreated().compareTo(a.getDateCreated()))
        .collect(Collectors.toList());
        
        // Add alert lists to the model
        model.addAttribute("currentAlerts", currentAlerts);
        model.addAttribute("archivedAlerts", archivedAlerts);
        
        model.addAttribute("currentTab", tab);
        
        return "EmergencyAlerts";
    }

    @GetMapping("/{id}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getAlert(@PathVariable UUID id) {
        EmergencyAlerts alert = emergencyAlertService.getAlertById(id);
        if (alert == null) {
            return ResponseEntity.notFound().build();
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("id", alert.getId());
        response.put("title", alert.getTitle() != null ? alert.getTitle() : "N/A");
        response.put("message", alert.getMessage() != null ? alert.getMessage() : "N/A");
        response.put("location", alert.getLocation() != null ? alert.getLocation() : "N/A");
        response.put("type", alert.getType() != null ? alert.getType() : "N/A");
        response.put("priority", alert.getPriority() != null ? alert.getPriority() : "N/A");
        response.put("status", alert.getStatus() != null ? alert.getStatus() : "N/A");
        response.put("dateCreated", alert.getDateCreated() != null ? alert.getDateCreated().toString() : null);
        response.put("archived", alert.isArchived());
        response.put("createdByName", alert.getCreatedByName() != null ? alert.getCreatedByName() : "N/A");
        response.put("createdByRole", alert.getCreatedByRole() != null ? alert.getCreatedByRole() : "N/A");
        response.put("latitude", alert.getLatitude() != null ? alert.getLatitude() : null);
        response.put("longitude", alert.getLongitude() != null ? alert.getLongitude() : null);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/create")
    @ResponseBody
    public ResponseEntity<?> createAlert(@RequestBody EmergencyAlerts alert, Principal principal) {
        String username = principal.getName();
        AdminUser admin = adminUserService.getAdminByEmail(username);
        
        // Set status to ACTIVE
        alert.setStatus("ACTIVE");
        
        // Assign creator
        alert.assignCreator(admin);
        
        EmergencyAlerts saved = emergencyAlertService.saveAlert(alert);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Alert created successfully");
        response.put("id", saved.getId());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/archive")
    @ResponseBody
    public ResponseEntity<?> archiveAlert(@PathVariable UUID id) {
        EmergencyAlerts alert = emergencyAlertService.getAlertById(id);
        if (alert == null) {
            return ResponseEntity.notFound().build();
        }
        
        alert.setArchived(true);
        alert.setStatus("ARCHIVED");
        
        emergencyAlertService.saveAlert(alert);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Alert archived successfully");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @ResponseBody
    public ResponseEntity<?> deleteAlert(@PathVariable UUID id) {
        EmergencyAlerts alert = emergencyAlertService.getAlertById(id);
        if (alert == null) {
            return ResponseEntity.notFound().build();
        }
        
        emergencyAlertService.deleteAlert(id);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Alert deleted successfully");
        return ResponseEntity.ok(response);
    }
}