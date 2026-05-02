package com.example.demo.controller;

import com.example.demo.model.AdminUser;
import com.example.demo.model.DocumentRequest;
import com.example.demo.services.AdminUserServices;
import com.example.demo.services.ActivityLogService;
import com.example.demo.services.DocumentRequestService;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Controller
@RequestMapping("/requests-document")
public class DocumentRequestController {

    private final DocumentRequestService service;
    private final AdminUserServices adminUserService;
    private final ActivityLogService activityLogService;

    public DocumentRequestController(
            DocumentRequestService service,
            AdminUserServices adminUserService,
            ActivityLogService activityLogService) {
        this.service = service;
        this.adminUserService = adminUserService;
        this.activityLogService = activityLogService;
    }

    @GetMapping
    public String documentRequestsPage(Model model, Principal principal) {
        if (principal != null) {
            AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
            if (admin != null) {
                model.addAttribute("currentUser", admin.getName());
                model.addAttribute("currentrole", admin.getRole());
                Set<String> allowed = Set.of("ADMIN", "SECRETARY", "BARANGAY-CAPTAIN", "TREASURER");
                if (!allowed.contains(admin.getRole())) return "redirect:/home";
            } else {
                model.addAttribute("currentUser", principal.getName());
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

    // Instead of doc.getRequesterName() and doc.getRequestType()
// Use the actual field names from your DocumentRequest model

        @PostMapping("/{id}/process")
        public String processRequest(
                @PathVariable Long id,
                Principal principal,
                HttpServletRequest request) {

            AdminUser admin = adminUserService.getAdminByEmail(principal.getName());

            if ("ARCHIVED".equalsIgnoreCase(admin.getEmpstatus())) {
                return "redirect:/logout";
            }

            DocumentRequest doc = service.getById(id);
            
            // Use the correct field names - likely these:
            String requesterName = doc != null ? doc.getFullName() : "#" + id;  // Changed from getRequesterName()
            String requestType   = doc != null ? doc.getDocumentType() : "Document";  // Changed from getRequestType()

            service.updateStatus(id, "PROCESSING", admin.getName());

            activityLogService.log(
                admin.getName(), admin.getRole(), "UPDATED", "Document Requests",
                "Started processing " + requestType + " request for " + requesterName,
                request.getRemoteAddr(), "Success"
            );

            return "redirect:/requests-document";
        }

        @PostMapping("/{id}/ready")
        public String markReady(
                @PathVariable Long id,
                Principal principal,
                HttpServletRequest request) {

            AdminUser admin = adminUserService.getAdminByEmail(principal.getName());

            DocumentRequest doc = service.getById(id);
            String requesterName = doc != null ? doc.getFullName() : "#" + id;  // Fixed
            String requestType   = doc != null ? doc.getDocumentType() : "Document";  // Fixed

            service.updateStatus(id, "READY", admin.getName());

            activityLogService.log(
                admin.getName(), admin.getRole(), "UPDATED", "Document Requests",
                requestType + " request for " + requesterName + " is ready for pickup",
                request.getRemoteAddr(), "Success"
            );

            return "redirect:/requests-document";
        }

        @PostMapping("/{id}/archive")
        public String archiveRequest(
                @PathVariable Long id,
                Principal principal,
                HttpServletRequest request) {

            AdminUser admin = adminUserService.getAdminByEmail(principal.getName());

            DocumentRequest doc = service.getById(id);
            String requesterName = doc != null ? doc.getFullName() : "#" + id;  // Fixed
            String requestType   = doc != null ? doc.getDocumentType() : "Document";  // Fixed

            service.archiveRequest(id, admin.getName());

            activityLogService.log(
                admin.getName(), admin.getRole(), "ARCHIVED", "Document Requests",
                "Archived " + requestType + " request for " + requesterName,
                request.getRemoteAddr(), "Success"
            );

            return "redirect:/requests-document";
        }

    @GetMapping("/search")
    @ResponseBody
    public List<DocumentRequest> search(@RequestParam String query) {
        return service.searchRequests(query);
    }

    private String getCurrentUserName(Principal principal) {
        if (principal != null) {
            AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
            if (admin != null) return admin.getName();
            return principal.getName();
        }
        return "System";
    }
    @GetMapping("/api/poll")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> pollRequests() {
        Map<String, Object> response = new HashMap<>();
        response.put("incoming", service.getByStatus("INCOMING").size());
        response.put("processing", service.getByStatus("PROCESSING").size());
        response.put("ready", service.getByStatus("READY").size());
        response.put("archived", service.getByStatus("RESOLVED").size());
        return ResponseEntity.ok(response);
    }
}
