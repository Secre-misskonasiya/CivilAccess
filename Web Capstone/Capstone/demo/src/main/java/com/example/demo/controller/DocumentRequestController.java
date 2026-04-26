package com.example.demo.controller;

import com.example.demo.model.AdminUser;
import com.example.demo.model.DocumentRequest;
import com.example.demo.services.AdminUserServices;
import com.example.demo.services.DocumentRequestService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Set;

@Controller
@RequestMapping("/requests-document")
public class DocumentRequestController {

    private final DocumentRequestService service;
    private final AdminUserServices adminUserService;

    public DocumentRequestController(DocumentRequestService service, AdminUserServices adminUserService) {
        this.service = service;
        this.adminUserService = adminUserService;
    }

    // ── Main page ──────────────────────────────────────────────────────────────
    @GetMapping
    public String documentRequestsPage(Model model, Principal principal) {
        if (principal != null) {
            String username = principal.getName();
            AdminUser admin = adminUserService.getAdminByEmail(username);

            if (admin != null) {
                model.addAttribute("currentUser", admin.getName());
                model.addAttribute("currentrole", admin.getRole());

                Set<String> allowedRoles = Set.of("ADMIN", "SECRETARY", "BARANGAY-CAPTAIN", "TREASURER");
                if (!allowedRoles.contains(admin.getRole())) return "redirect:/home";

            } else {
                model.addAttribute("currentUser", username);
                model.addAttribute("currentrole", "USER");
            }
        } else {
            model.addAttribute("currentUser", "Guest");
            model.addAttribute("currentrole", "USER");
        }

        model.addAttribute("incomingRequests",   service.getByStatus("INCOMING"));
        model.addAttribute("processingRequests", service.getByStatus("PROCESSING"));
        model.addAttribute("readyRequests",      service.getByStatus("READY"));
        model.addAttribute("archivedRequests",   service.getByStatus("RESOLVED"));

        return "Requests-document";
    }

    // ── Move to Processing ─────────────────────────────────────────────────────
    @PostMapping("/{id}/process")
    public String processRequest(@PathVariable Long id, Principal principal) {
        String user = getCurrentUserName(principal);
        service.updateStatus(id, "PROCESSING", user);
        return "redirect:/requests-document";
    }

    // ── Mark as Ready ──────────────────────────────────────────────────────────
    @PostMapping("/{id}/ready")
    public String markReady(@PathVariable Long id, Principal principal) {
        String user = getCurrentUserName(principal);
        service.updateStatus(id, "READY", user);
        return "redirect:/requests-document";
    }

    // ── Archive (mark Resolved) ────────────────────────────────────────────────
    @PostMapping("/{id}/archive")
    public String archiveRequest(@PathVariable Long id, Principal principal) {
        String user = getCurrentUserName(principal);
        service.archiveRequest(id, user);
        return "redirect:/requests-document";
    }

    // ── Search (AJAX) ──────────────────────────────────────────────────────────
    @GetMapping("/search")
    @ResponseBody
    public List<DocumentRequest> search(@RequestParam String query) {
        return service.searchRequests(query);
    }

    // ── Helper ────────────────────────────────────────────────────────────────
    private String getCurrentUserName(Principal principal) {
        if (principal != null) {
            String username = principal.getName();
            AdminUser admin = adminUserService.getAdminByEmail(username);
            if (admin != null) return admin.getName();
            return username;
        }
        return "System";
    }
}