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

    @GetMapping
    public String blotterRequestsPage(Model model, Principal principal) {
        if (principal != null) {
            String username = principal.getName();
            AdminUser admin = adminUserService.getAdminByEmail(username);
            if (admin != null) {
                model.addAttribute("currentUser", admin.getName());
                model.addAttribute("currentrole", admin.getRole());
            } else {
                model.addAttribute("currentUser", username);
                model.addAttribute("currentrole", "USER");
            }
        } else {
            model.addAttribute("currentUser", "Guest");
            model.addAttribute("currentrole", "USER");
        }
        model.addAttribute("incomingBlotters",   service.getByStatus("INCOMING"));
        model.addAttribute("processingBlotters", service.getByStatus("PROCESSING"));
        model.addAttribute("readyBlotters",      service.getByStatus("READY"));
        model.addAttribute("archivedBlotters",   service.getByStatus("ARCHIVE"));
        return "Requests-Blotter";
    }

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

    @GetMapping("/search")
    @ResponseBody
    public List<Blotter> search(@RequestParam String query) {
        return service.searchBlotters(query);
    }

    @PostMapping("/submit")
    public String submitBlotter(@ModelAttribute("newBlotter") Blotter blotter, Principal principal) {
        blotter.setStatus("INCOMING");
        blotter.setCreatedBy(getCurrentUserName(principal));
        service.saveBlotter(blotter);
        return "redirect:/requests-blotter";
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