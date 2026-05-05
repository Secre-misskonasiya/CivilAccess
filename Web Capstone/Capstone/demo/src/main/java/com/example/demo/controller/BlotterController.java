package com.example.demo.controller;

import com.example.demo.model.AdminUser;
import com.example.demo.model.Blotter;
import com.example.demo.services.AdminUserServices;
import com.example.demo.services.BlotterService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/requests-blotter")
public class BlotterController {

    private final BlotterService service;
    private final AdminUserServices adminUserService;

    public BlotterController(BlotterService service, AdminUserServices adminUserService) {
        this.service = service;
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public String blotterRequestsPage(Model model, Principal principal) {
        if (principal != null) {
            String username = principal.getName();
            AdminUser admin = adminUserService.getAdminByEmail(username);
            if (admin != null) {
                model.addAttribute("currentUser", admin.getName());
                model.addAttribute("currentrole", admin.getRole());
                model.addAttribute("currentstatus", "ACTIVE");
            } else {
                model.addAttribute("currentUser", username);
                model.addAttribute("currentrole", "USER");
                model.addAttribute("currentstatus", "ACTIVE");
            }
        } else {
            model.addAttribute("currentUser", "Guest");
            model.addAttribute("currentrole", "USER");
            model.addAttribute("currentstatus", "ACTIVE");
        }

        // For tab-based status view
        model.addAttribute("incomingBlotters",   service.getByStatus("INCOMING"));
        model.addAttribute("processingBlotters", service.getByStatus("PROCESSING"));
        model.addAttribute("readyBlotters",      service.getByStatus("READY"));
        model.addAttribute("archivedBlotters",   service.getByStatus("ARCHIVE"));

        // For full table view (optional - can be used by different template)
        model.addAttribute("allBlotters", service.getAllBlotters());
        model.addAttribute("totalCount", service.countAll());

        // Tab badge counts
        model.addAttribute("processingCount", service.getByStatus("PROCESSING").size());
        model.addAttribute("readyCount",      service.getByStatus("READY").size());
        model.addAttribute("archivedCount",   service.getByStatus("ARCHIVE").size());

        return "Requests-Blotter";
    }

    // Status management endpoints
    @PostMapping("/{id}/process")
    public String processBlotter(@PathVariable Long id, Principal principal) {
        service.updateStatus(id, "PROCESSING", getCurrentUserName(principal));
        return "redirect:/requests-blotter";
    }

    @PostMapping("/{id}/ready")
    public String markReady(@PathVariable Long id, Principal principal) {
        service.updateStatus(id, "READY", getCurrentUserName(principal));
        return "redirect:/requests-blotter";
    }

    @PostMapping("/{id}/archive")
    public String archiveBlotter(@PathVariable Long id, Principal principal) {
        service.archiveBlotter(id, getCurrentUserName(principal));
        return "redirect:/requests-blotter";
    }

    // Fixed update endpoint with better error handling
    @PostMapping("/{id}/update")
    public String updateBlotter(@PathVariable Long id, 
                               @RequestParam("complainantName") String complainantName,
                               @RequestParam("contactInfo") String contactInfo,
                               @RequestParam("respondentName") String respondentName,
                               @RequestParam("incidentType") String incidentType,
                               @RequestParam("incidentDate") String incidentDate,
                               @RequestParam("incidentLocation") String incidentLocation,
                               @RequestParam("narrative") String narrative,
                               @RequestParam(value = "remarks", required = false) String remarks,
                               @RequestParam("status") String status,
                               Principal principal) {
        try {
            Blotter existing = service.getBlotterById(id);
            if (existing != null) {
                existing.setComplainantName(complainantName);
                existing.setContactInfo(contactInfo);
                existing.setRespondentName(respondentName);
                existing.setIncidentType(incidentType);
                
                // Parse the date string to LocalDateTime
                if (incidentDate != null && !incidentDate.isEmpty()) {
                    LocalDateTime dateTime = LocalDateTime.parse(incidentDate + "T00:00:00");
                    existing.setIncidentDate(dateTime);
                }
                
                existing.setIncidentLocation(incidentLocation);
                existing.setNarrative(narrative);
                existing.setRemarks(remarks != null ? remarks : "");
                existing.setStatus(status);
                existing.setUpdatedBy(getCurrentUserName(principal));
                existing.setUpdatedAt(LocalDateTime.now());
                service.saveBlotter(existing);
            }
        } catch (Exception e) {
            e.printStackTrace();
            return "redirect:/requests-blotter?error=update_failed";
        }
        return "redirect:/requests-blotter?success=updated";
    }

   // FIXED: Submit new blotter with PROCESSING status instead of INCOMING
@PostMapping("/submit")
public String submitBlotter(@RequestParam("complainantName") String complainantName,
                           @RequestParam("contactInfo") String contactInfo,
                           @RequestParam("respondentName") String respondentName,
                           @RequestParam("incidentType") String incidentType,
                           @RequestParam("incidentDate") String incidentDate,
                           @RequestParam("incidentLocation") String incidentLocation,
                           @RequestParam("narrative") String narrative,
                           @RequestParam(value = "remarks", required = false) String remarks,
                           Principal principal) {
    try {
        Blotter blotter = new Blotter();
        blotter.setComplainantName(complainantName);
        blotter.setContactInfo(contactInfo);
        blotter.setRespondentName(respondentName);
        blotter.setIncidentType(incidentType);
        
        // Parse the date string to LocalDateTime
        if (incidentDate != null && !incidentDate.isEmpty()) {
            LocalDateTime dateTime = LocalDateTime.parse(incidentDate + "T00:00:00");
            blotter.setIncidentDate(dateTime);
        }
        
        blotter.setIncidentLocation(incidentLocation);
        blotter.setNarrative(narrative);
        blotter.setRemarks(remarks != null ? remarks : "");
        blotter.setStatus("PROCESSING"); // Changed from "INCOMING" to "PROCESSING"
        blotter.setCreatedBy(getCurrentUserName(principal));
        blotter.setCreatedAt(LocalDateTime.now());
        blotter.setUpdatedAt(LocalDateTime.now());
        
        System.out.println("Saving blotter with status: PROCESSING");
        service.saveBlotter(blotter);
        System.out.println("Blotter saved successfully with ID: " + blotter.getId());
    } catch (Exception e) {
        e.printStackTrace();
        return "redirect:/requests-blotter?error=submit_failed";
    }
    return "redirect:/requests-blotter?success=submitted";
}

    // Search endpoint
    @GetMapping("/search")
    @ResponseBody
    public List<Blotter> search(@RequestParam String query) {
        return service.searchBlotters(query);
    }

    // Polling endpoint - returns both tab counts and total
    @GetMapping("/api/poll")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> pollBlotters() {
        Map<String, Object> counts = new HashMap<>();
        counts.put("processing", service.getByStatus("PROCESSING").size());
        counts.put("ready",      service.getByStatus("READY").size());
        counts.put("archive",    service.getByStatus("ARCHIVE").size());
        counts.put("total",      service.countAll());

        Map<String, Object> response = new HashMap<>();
        response.put("counts", counts);
        return ResponseEntity.ok(response);
    }

    private String getCurrentUserName(Principal principal) {
        if (principal != null) {
            AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
            if (admin != null) return admin.getName();
            return principal.getName();
        }
        return "System";
    }
}