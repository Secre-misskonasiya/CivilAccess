package com.example.demo.controller;

import com.example.demo.model.AdminUser;
import com.example.demo.model.Blotter;
import com.example.demo.services.AdminUserServices;
import com.example.demo.services.BlotterService;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
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

        // Get ALL blotters for the main table
        model.addAttribute("allBlotters", service.getAllBlotters());
        model.addAttribute("totalCount", service.countAll());

        return "Requests-Blotter";
    }

    @PostMapping("/{id}/update")
    public String updateBlotter(@PathVariable Long id, 
                               @ModelAttribute Blotter updatedBlotter,
                               Principal principal) {
        Blotter existing = service.getBlotterById(id);
        if (existing != null) {
            existing.setComplainantName(updatedBlotter.getComplainantName());
            existing.setContactInfo(updatedBlotter.getContactInfo());
            existing.setRespondentName(updatedBlotter.getRespondentName());
            existing.setIncidentType(updatedBlotter.getIncidentType());
            existing.setIncidentDate(updatedBlotter.getIncidentDate());
            existing.setIncidentLocation(updatedBlotter.getIncidentLocation());
            existing.setNarrative(updatedBlotter.getNarrative());
            existing.setRemarks(updatedBlotter.getRemarks());
            existing.setStatus(updatedBlotter.getStatus());
            existing.setUpdatedBy(getCurrentUserName(principal));
            existing.setUpdatedAt(LocalDateTime.now());
            service.saveBlotter(existing);
        }
        return "redirect:/requests-blotter";
    }

    @GetMapping("/search")
    @ResponseBody
    public List<Blotter> search(@RequestParam String query) {
        return service.searchBlotters(query);
    }

    @PostMapping("/submit")
    public String submitBlotter(@ModelAttribute("newBlotter") Blotter blotter, Principal principal) {
        blotter.setStatus("INCOMING");
        blotter.setCreatedBy(getCurrentUserName(principal));
        blotter.setCreatedAt(LocalDateTime.now());
        blotter.setUpdatedAt(LocalDateTime.now());
        if (blotter.getRemarks() == null) {
            blotter.setRemarks("");
        }
        service.saveBlotter(blotter);
        return "redirect:/requests-blotter";
    }

    @GetMapping("/api/poll")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> pollBlotters() {
        Map<String, Object> counts = new HashMap<>();
        counts.put("total", service.countAll());

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