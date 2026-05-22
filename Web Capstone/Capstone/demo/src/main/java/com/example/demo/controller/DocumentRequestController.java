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
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

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
                model.addAttribute("currentstatus", admin.getEmpstatus());
                Set<String> allowed = Set.of("ADMIN", "SECRETARY", "BARANGAY-CAPTAIN", "TREASURER");
                if (!allowed.contains(admin.getRole())) return "redirect:/home";
            } else {
                model.addAttribute("currentUser", principal.getName());
                model.addAttribute("currentrole", "USER");
                model.addAttribute("currentstatus", "Active");
            }
        } else {
            model.addAttribute("currentUser", "Guest");
            model.addAttribute("currentrole", "USER");
            model.addAttribute("currentstatus", "Active");
        }

        List<DocumentRequest> incoming = service.getByStatus("INCOMING");
        List<DocumentRequest> processing = service.getByStatus("PROCESSING");
        List<DocumentRequest> ready = service.getByStatus("READY");
        List<DocumentRequest> archived = service.getByStatus("RESOLVED");

        // Sort by createdAt descending (newest first)
        incoming = sortByDateDescending(incoming);
        processing = sortByDateDescending(processing);
        ready = sortByDateDescending(ready);
        archived = sortByDateDescending(archived);

        java.util.Collections.reverse(incoming);
        model.addAttribute("incomingRequests", incoming);

        java.util.Collections.reverse(processing);
        model.addAttribute("processingRequests", processing);

        java.util.Collections.reverse(ready);
        model.addAttribute("readyRequests", ready);

        java.util.Collections.reverse(archived);
        model.addAttribute("archivedRequests", archived);
        
        model.addAttribute("incomingCount", incoming.size());
        model.addAttribute("processingCount", processing.size());
        model.addAttribute("readyCount", ready.size());
        model.addAttribute("archivedCount", archived.size());

        return "Requests-document";
    }

    private List<DocumentRequest> sortByDateDescending(List<DocumentRequest> requests) {
        return requests.stream()
            .sorted(Comparator.comparing(DocumentRequest::getCreatedAt, 
                Comparator.nullsLast(Comparator.reverseOrder())))
            .collect(Collectors.toList());
    }

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
        
        String requesterName = doc != null ? doc.getFullName() : "#" + id;
        String requestType   = doc != null ? doc.getDocumentType() : "Document";

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
        String requesterName = doc != null ? doc.getFullName() : "#" + id;
        String requestType   = doc != null ? doc.getDocumentType() : "Document";

        service.updateStatus(id, "READY", admin.getName());

        activityLogService.log(
            admin.getName(), admin.getRole(), "UPDATED", "Document Requests",
            requestType + " request for " + requesterName + " is ready for pickup",
            request.getRemoteAddr(), "Success"
        );

        return "redirect:/requests-document";
    }

    @PostMapping("/{id}/save-field-edits")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> saveFieldEdits(
            @PathVariable Long id,
            @RequestParam Map<String, String> params,
            Principal principal,
            HttpServletRequest request) {

        Map<String, Object> response = new HashMap<>();
        try {
            AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
            DocumentRequest doc = service.getById(id);

            if (doc == null) {
                response.put("success", false);
                response.put("message", "Document not found");
                return ResponseEntity.badRequest().body(response);
            }

            // Core fields — all document types
            if (params.containsKey("fullName"))         doc.setFullName(params.get("fullName"));
            if (params.containsKey("address"))          doc.setAddress(params.get("address"));
            if (params.containsKey("birthdate"))        doc.setBirthdate(params.get("birthdate"));
            if (params.containsKey("contactNumber"))    doc.setContactNumber(params.get("contactNumber"));
            if (params.containsKey("emergencyName"))    doc.setEmergencyName(params.get("emergencyName"));
            if (params.containsKey("emergencyAddress")) doc.setEmergencyAddress(params.get("emergencyAddress"));
            if (params.containsKey("emergencyContact")) doc.setEmergencyContact(params.get("emergencyContact"));
            
            // Middle name field
            if (params.containsKey("middleName"))       doc.setMiddleName(params.get("middleName"));

            // Extra fields — Indigency & Clearance
            if (params.containsKey("docAge"))              doc.setDocAge(params.get("docAge"));
            if (params.containsKey("docCivilStatus"))      doc.setDocCivilStatus(params.get("docCivilStatus"));
            if (params.containsKey("docGender"))           doc.setDocGender(params.get("docGender"));
            if (params.containsKey("docIssuedDay"))        doc.setDocIssuedDay(params.get("docIssuedDay"));
            if (params.containsKey("docIssuedMonthYear"))  doc.setDocIssuedMonthYear(params.get("docIssuedMonthYear"));
            if (params.containsKey("docCaptainName"))      doc.setDocCaptainName(params.get("docCaptainName"));
            if (params.containsKey("docOrNumber"))         doc.setDocOrNumber(params.get("docOrNumber"));
            if (params.containsKey("docDateIssued"))       doc.setDocDateIssued(params.get("docDateIssued"));
            if (params.containsKey("docPurpose"))          doc.setDocPurpose(params.get("docPurpose"));
            if (params.containsKey("docNbNote"))           doc.setDocNbNote(params.get("docNbNote"));

            // purposeOfRequest is NEVER touched — it's the resident's original submission

            service.getRepository().save(doc);

            activityLogService.log(
                admin.getName(), admin.getRole(), "UPDATED", "Document Requests",
                "Edited fields for " + doc.getFullName() + " (" + doc.getDocumentType() + ")",
                request.getRemoteAddr(), "Success"
            );

            response.put("success", true);
            response.put("message", "Fields saved");

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Error: " + e.getMessage());
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/save-readied-document")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> saveReadiedDocumentUrl(
            @PathVariable Long id,
            @RequestParam("documentUrl") String documentUrl,
            Principal principal,
            HttpServletRequest request) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
            DocumentRequest doc = service.getById(id);
            
            if (doc == null) {
                response.put("success", false);
                response.put("message", "Document not found");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Save the Supabase URL to readied_document column and mark as READY
            service.updateReadiedDocument(id, documentUrl, admin.getName());
            
            activityLogService.log(
                admin.getName(), admin.getRole(), "UPDATED", "Document Requests",
                "Marked as READY and saved document for " + doc.getFullName() + " (" + doc.getDocumentType() + ")",
                request.getRemoteAddr(), "Success"
            );
            
            response.put("success", true);
            response.put("message", "Document saved and marked as READY");
            
        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Error saving document: " + e.getMessage());
        }
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/save-document-only")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> saveDocumentOnly(
            @PathVariable Long id,
            @RequestParam("documentUrl") String documentUrl,
            Principal principal,
            HttpServletRequest request) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
            DocumentRequest doc = service.getById(id);
            
            if (doc == null) {
                response.put("success", false);
                response.put("message", "Document not found");
                return ResponseEntity.badRequest().body(response);
            }
            
            // ONLY save the document URL, do NOT change status to READY
            doc.setReadiedDocumentUrl(documentUrl);
            // Status remains PROCESSING - no change
            service.getRepository().save(doc);
            
            activityLogService.log(
                admin.getName(), admin.getRole(), "UPDATED", "Document Requests",
                "Saved document draft for " + doc.getFullName() + " (" + doc.getDocumentType() + ")",
                request.getRemoteAddr(), "Success"
            );
            
            response.put("success", true);
            response.put("message", "Document draft saved successfully (status unchanged)");
            
        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Error saving document: " + e.getMessage());
        }
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/archive")
    public String archiveRequest(
            @PathVariable Long id,
            Principal principal,
            HttpServletRequest request) {

        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());

        DocumentRequest doc = service.getById(id);
        String requesterName = doc != null ? doc.getFullName() : "#" + id;
        String requestType   = doc != null ? doc.getDocumentType() : "Document";

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
        List<DocumentRequest> results = service.searchRequests(query);
        return sortByDateDescending(results);
    }

    @GetMapping("/api/poll")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> pollRequests() {
        Map<String, Object> counts = new HashMap<>();
        counts.put("incoming",   service.getByStatus("INCOMING").size());
        counts.put("processing", service.getByStatus("PROCESSING").size());
        counts.put("ready",      service.getByStatus("READY").size());
        counts.put("archive",    service.getByStatus("RESOLVED").size());

        Map<String, Object> response = new HashMap<>();
        response.put("counts", counts);
        return ResponseEntity.ok(response);
    }
}