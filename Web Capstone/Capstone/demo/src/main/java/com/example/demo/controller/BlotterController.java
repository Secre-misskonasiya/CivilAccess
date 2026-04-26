package com.example.demo.controller;

import com.example.demo.model.AdminUser;
import com.example.demo.model.Blotter;
import com.example.demo.services.AdminUserServices;
import com.example.demo.services.BlotterService;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@Controller
@RequestMapping("/requests-blotter")
public class BlotterController {

    private final BlotterService service;
    private final AdminUserServices adminUserService;

    public BlotterController(BlotterService service, AdminUserServices adminUserService) {
        this.service = service;
        this.adminUserService = adminUserService;
    }

    // ── Main page ──────────────────────────────────────────────────────────────
    @GetMapping
    public String blotterRequestsPage(Model model, Principal principal) {
        // Get the logged-in user information 
        if (principal != null) {
            String username = principal.getName();
            AdminUser admin = adminUserService.getAdminByEmail(username);
            
            if (admin != null) {
                String name = admin.getName();
                String role = admin.getRole();
                
                // Add user info to model
                model.addAttribute("currentUser", name);
                model.addAttribute("currentrole", role);
            } else {
                // Fallback if admin not found
                model.addAttribute("currentUser", username);
                model.addAttribute("currentrole", "USER");
            }
        } else {
            // Fallback if not logged in
            model.addAttribute("currentUser", "Guest");
            model.addAttribute("currentrole", "USER");
        }

        // Add the blotter lists by status
        model.addAttribute("incomingBlotters",   service.getByStatus("INCOMING"));
        model.addAttribute("processingBlotters", service.getByStatus("PROCESSING"));
        model.addAttribute("readyBlotters",      service.getByStatus("READY"));
        model.addAttribute("archivedBlotters",   service.getByStatus("ARCHIVE"));

        return "Requests-blotter";
    }

    // ── Move to Processing (Approve) ───────────────────────────────────────────
    @PostMapping("/{id}/process")
    public String processBlotter(@PathVariable Long id, Principal principal) {
        String user = getCurrentUserName(principal);
        service.updateStatus(id, "PROCESSING", user);
        return "redirect:/requests-blotter";
    }

    // ── Mark as Ready/Resolved ─────────────────────────────────────────────────
    @PostMapping("/{id}/ready")
    public String markReady(@PathVariable Long id, Principal principal) {
        String user = getCurrentUserName(principal);
        service.updateStatus(id, "READY", user);
        return "redirect:/requests-blotter";
    }

    // ── Archive ────────────────────────────────────────────────────────────────
    @PostMapping("/{id}/archive")
    public String archiveBlotter(@PathVariable Long id, Principal principal) {
        String user = getCurrentUserName(principal);
        service.archiveBlotter(id, user);
        return "redirect:/requests-blotter";
    }

    // ── Search (AJAX) ──────────────────────────────────────────────────────────
    @GetMapping("/search")
    @ResponseBody
    public List<Blotter> search(@RequestParam String query) {
        return service.searchBlotters(query);
    }
    
    // ── Submit new blotter report ──────────────────────────────────────────────
    @PostMapping("/submit")
    public String submitBlotter(@ModelAttribute("newBlotter") Blotter blotter, Principal principal) {
        String user = getCurrentUserName(principal);
        blotter.setStatus("INCOMING");
        blotter.setCreatedBy(user);
        service.saveBlotter(blotter);
        return "redirect:/requests-blotter";
    }
    
    // Helper method to get current user name
    private String getCurrentUserName(Principal principal) {
        if (principal != null) {
            String username = principal.getName();
            AdminUser admin = adminUserService.getAdminByEmail(username);
            if (admin != null) {
                return admin.getName();
            }
            return username;
        }
        return "System";
    }
}