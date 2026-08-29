package com.example.demo.controller;

import com.example.demo.model.AdminUser;
import com.example.demo.model.SafetyReports;
import com.example.demo.services.ActivityLogService;
import com.example.demo.services.AdminUserServices;
import com.example.demo.services.SafetyReportService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/safety-reports")
public class SafetyReportsController {

    @Autowired
    private SafetyReportService safetyReportService;

    @Autowired
    private AdminUserServices adminUserService;

    @Autowired
    private ActivityLogService activityLogService;

    @GetMapping
    public String viewSafetyReports(
        @RequestParam(defaultValue = "incoming") String tab,
        Principal principal,
        Model model) {

        String username = principal.getName();
        AdminUser admin = adminUserService.getAdminByEmail(username);

        String name = admin.getName();
        String role = admin.getRole();
        
        if ("Archived".equalsIgnoreCase(admin.getEmpstatus())) {
            return "redirect:/logout";
        }
        
        // REDIRECT TREASURER to a different page (e.g., dashboard or home)
        if ("TREASURER".equalsIgnoreCase(role)) {
            return "redirect:/dashboard"; // Change this to your desired redirect URL
        }
        
        model.addAttribute("newAdmin", new AdminUser());
        model.addAttribute("currentUser", name);
        model.addAttribute("currentrole", role);

        List<SafetyReports> allReports = safetyReportService.getAllReports();

        // INCOMING
        List<SafetyReports> incomingReports = allReports.stream()
                .filter(r -> "INCOMING".equalsIgnoreCase(r.getStatus()))
                .sorted(Comparator
                        .comparing(SafetyReports::getDateSubmitted, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Comparator.comparing(SafetyReports::getId, Comparator.reverseOrder())))
                .collect(Collectors.toList());

        // APPROVED
        List<SafetyReports> approvedReports = allReports.stream()
                .filter(r -> "APPROVED".equalsIgnoreCase(r.getStatus()))
                .sorted(Comparator
                        .comparing(SafetyReports::getDateSubmitted, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Comparator.comparing(SafetyReports::getId, Comparator.reverseOrder())))
                .collect(Collectors.toList());

        // IN PROGRESS
        List<SafetyReports> inProgressReports = allReports.stream()
                .filter(r -> "IN_PROGRESS".equalsIgnoreCase(r.getStatus()) || "INPROGRESS".equalsIgnoreCase(r.getStatus()))
                .sorted(Comparator
                        .comparing(SafetyReports::getDateSubmitted, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Comparator.comparing(SafetyReports::getId, Comparator.reverseOrder())))
                .collect(Collectors.toList());

        // RESOLVED
        List<SafetyReports> resolvedReports = allReports.stream()
                .filter(r -> "RESOLVED".equalsIgnoreCase(r.getStatus()))
                .sorted((a, b) -> {
                    LocalDateTime aDate = a.getDateHandled();
                    LocalDateTime bDate = b.getDateHandled();
                    if (aDate == null && bDate == null) return 0;
                    if (aDate == null) return 1;
                    if (bDate == null) return -1;
                    return bDate.compareTo(aDate);
                })
                .collect(Collectors.toList());

        // CANCELLED & REJECTED (combined in one tab)
        List<SafetyReports> cancelledRejectedReports = allReports.stream()
                .filter(r -> "REJECTED".equalsIgnoreCase(r.getStatus()) 
                          || "CANCELLED".equalsIgnoreCase(r.getStatus()))
                .sorted((a, b) -> {
                    LocalDateTime aDate = a.getDateHandled();
                    LocalDateTime bDate = b.getDateHandled();
                    if (aDate == null && bDate == null) return 0;
                    if (aDate == null) return 1;
                    if (bDate == null) return -1;
                    return bDate.compareTo(aDate);
                })
                .collect(Collectors.toList());

        model.addAttribute("incomingReports", incomingReports);
        model.addAttribute("approvedReports", approvedReports);
        model.addAttribute("inProgressReports", inProgressReports);
        model.addAttribute("resolvedReports", resolvedReports);
        model.addAttribute("cancelledRejectedReports", cancelledRejectedReports);

        model.addAttribute("incomingCount", incomingReports.size());
        model.addAttribute("approvedCount", approvedReports.size());
        model.addAttribute("inProgressCount", inProgressReports.size());
        model.addAttribute("resolvedCount", resolvedReports.size());
        model.addAttribute("cancelledRejectedCount", cancelledRejectedReports.size());

        model.addAttribute("currentTab", tab);

        return "SafetyReports";
    }

    @GetMapping("/{id}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getReport(@PathVariable Long id, Principal principal) {
        SafetyReports report = safetyReportService.getReportById(id);
        if (report == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Check if user is TREASURER - deny access
        String username = principal.getName();
        AdminUser admin = adminUserService.getAdminByEmail(username);
        if ("TREASURER".equalsIgnoreCase(admin.getRole())) {
            return ResponseEntity.status(403).build();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("id", report.getId());
        response.put("title", report.getTitle() != null ? report.getTitle() : "N/A");
        response.put("location", report.getLocation() != null ? report.getLocation() : "N/A");
        response.put("description", report.getDescription() != null ? report.getDescription() : "N/A");
        response.put("type", report.getType() != null ? report.getType() : "Safety");
        response.put("priority", report.getPriority() != null ? report.getPriority() : "N/A");
        response.put("reporterName", report.getReporterName() != null ? report.getReporterName() : "N/A");
        response.put("reporterContact", report.getReporterContact() != null ? report.getReporterContact() : "N/A");
        response.put("dateSubmitted", report.getDateSubmitted() != null ? report.getDateSubmitted().toString() : null);
        response.put("status", report.getStatus() != null ? report.getStatus() : "N/A");
        response.put("handledByName", report.getHandledByName() != null ? report.getHandledByName() : "N/A");
        response.put("handledByRole", report.getHandledByRole() != null ? report.getHandledByRole() : "N/A");
        response.put("dateHandled", report.getDateHandled() != null ? report.getDateHandled().toString() : null);
        response.put("handlerRemarks", report.getHandlerRemarks() != null ? report.getHandlerRemarks() : "N/A");
        response.put("resolvedBy", report.getResolvedBy() != null ? report.getResolvedBy() : null);
        response.put("resolutionActions", report.getResolutionActions() != null ? report.getResolutionActions() : null);
        response.put("resolutionResponseTime", report.getResolutionResponseTime() != null ? report.getResolutionResponseTime() : null);
        response.put("resolutionNotes", report.getResolutionNotes() != null ? report.getResolutionNotes() : null);
        response.put("latitude", report.getLatitude() != null ? report.getLatitude() : null);
        response.put("longitude", report.getLongitude() != null ? report.getLongitude() : null);
        response.put("imageUrl", report.getImageUrl() != null ? report.getImageUrl() : null);
        response.put("timeSubmitted", report.getTimeSubmitted() != null ? report.getTimeSubmitted().toString() : null);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/all")
    @ResponseBody
    public ResponseEntity<List<Map<String, Object>>> getAllReportsForMap(Principal principal) {
        // Check if user is TREASURER - deny access to map data
        String username = principal.getName();
        AdminUser admin = adminUserService.getAdminByEmail(username);
        if ("TREASURER".equalsIgnoreCase(admin.getRole())) {
            return ResponseEntity.status(403).build();
        }
        
        List<SafetyReports> allReports = safetyReportService.getAllReports();

        List<Map<String, Object>> result = allReports.stream()
                .filter(r -> r.getLatitude() != null && r.getLongitude() != null)
                .map(r -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", r.getId());
                    m.put("title", r.getTitle() != null ? r.getTitle() : "Untitled");
                    m.put("location", r.getLocation() != null ? r.getLocation() : "No location");
                    m.put("type", r.getType() != null ? r.getType() : "Safety");
                    m.put("priority", r.getPriority() != null ? r.getPriority() : "LOW");
                    m.put("status", r.getStatus() != null ? r.getStatus() : "INCOMING");
                    m.put("reporterName", r.getReporterName() != null ? r.getReporterName() : "N/A");
                    m.put("dateSubmitted", r.getDateSubmitted() != null ? r.getDateSubmitted().toString() : null);
                    m.put("description", r.getDescription() != null ? r.getDescription() : "");
                    m.put("latitude", r.getLatitude());
                    m.put("longitude", r.getLongitude());
                    return m;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/api/poll")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> pollReports(@RequestParam Long lastId, Principal principal) {
        // Check if user is TREASURER - deny access
        String username = principal.getName();
        AdminUser admin = adminUserService.getAdminByEmail(username);
        if ("TREASURER".equalsIgnoreCase(admin.getRole())) {
            return ResponseEntity.status(403).build();
        }
        
        List<SafetyReports> allReports = safetyReportService.getAllReports();

        List<SafetyReports> newReports = allReports.stream()
                .filter(r -> r.getId() > lastId && "INCOMING".equalsIgnoreCase(r.getStatus()))
                .sorted(Comparator
                        .comparing(SafetyReports::getDateSubmitted, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Comparator.comparing(SafetyReports::getId, Comparator.reverseOrder())))
                .collect(Collectors.toList());

        Map<String, Long> counts = new HashMap<>();
        counts.put("incoming", allReports.stream()
                .filter(r -> "INCOMING".equalsIgnoreCase(r.getStatus())).count());
        counts.put("approved", allReports.stream()
                .filter(r -> "APPROVED".equalsIgnoreCase(r.getStatus())).count());
        counts.put("inprogress", allReports.stream()
                .filter(r -> "IN_PROGRESS".equalsIgnoreCase(r.getStatus()) || "INPROGRESS".equalsIgnoreCase(r.getStatus())).count());
        counts.put("resolved", allReports.stream()
                .filter(r -> "RESOLVED".equalsIgnoreCase(r.getStatus())).count());
        counts.put("cancelled_rejected", allReports.stream()
                .filter(r -> "REJECTED".equalsIgnoreCase(r.getStatus()) 
                          || "CANCELLED".equalsIgnoreCase(r.getStatus())).count());

        List<Map<String, Object>> reportList = newReports.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", r.getId());
            m.put("title", r.getTitle());
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("newReports", reportList);
        result.put("counts", counts);

        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/resolution")
    @ResponseBody
    public ResponseEntity<?> saveResolution(
            @PathVariable Long id,
            @RequestBody Map<String, String> resolutionData,
            Principal principal,
            HttpServletRequest request) {

        // Check role - only ADMIN, SECRETARY, SECRETARIAT STAFF can resolve
        String username = principal.getName();
        AdminUser admin = adminUserService.getAdminByEmail(username);
        String role = admin.getRole();
        
        if (!canManageReports(role)) {
            return ResponseEntity.status(403).body(Map.of("error", "Insufficient permissions"));
        }

        SafetyReports report = safetyReportService.getReportById(id);
        if (report == null) {
            return ResponseEntity.notFound().build();
        }
        
        String responseTime = calculateResponseTime(report);
        
        report.setResolutionActions(resolutionData.getOrDefault("actions", ""));
        report.setResolutionResponseTime(responseTime);
        report.setResolutionNotes(resolutionData.getOrDefault("notes", ""));
        
        safetyReportService.saveReport(report);

        activityLogService.log(
            principal.getName(), admin.getRole(), "RESOLVED", "Safety Reports",
            "Resolved the safety report: \"" + report.getTitle() + "\" and submitted resolution details",
            request.getRemoteAddr(), "Success"
        );

        Map<String, String> response = new HashMap<>();
        response.put("message", "Resolution saved successfully");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/status")
    @ResponseBody
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            Principal principal,
            HttpServletRequest request) {

        // Check role - only ADMIN, SECRETARY, SECRETARIAT STAFF can update status
        String username = principal.getName();
        AdminUser admin = adminUserService.getAdminByEmail(username);
        String role = admin.getRole();
        
        if (!canManageReports(role)) {
            return ResponseEntity.status(403).body(Map.of("error", "Insufficient permissions"));
        }

        SafetyReports report = safetyReportService.getReportById(id);
        if (report == null) {
            activityLogService.log(
                principal.getName(), admin.getRole(), "UPDATED", "Safety Reports",
                "Tried to update status of safety report #" + id + " but it was not found",
                request.getRemoteAddr(), "Failed"
            );
            return ResponseEntity.notFound().build();
        }

        report.setStatus(status);
        report.setDateHandled(LocalDateTime.now());
        report.setHandledByName(admin.getName());
        report.setHandledByRole(admin.getRole());

        // Set resolvedBy for REJECTED, CANCELLED, AND RESOLVED
        if ("REJECTED".equals(status) || "CANCELLED".equals(status) || "RESOLVED".equals(status)) {
            report.setResolvedBy(admin.getName());
        }

        safetyReportService.saveReport(report);

        String actionLabel = switch (status) {
            case "APPROVED"             -> "Approved the report and assigned a handler";
            case "IN_PROGRESS"          -> "Moved the report to In Progress";
            case "RESOLVED"             -> "Marked the report as resolved";
            case "REJECTED"             -> "Rejected the incoming report";
            case "CANCELLED"            -> "Cancelled the report";
            default                     -> "Updated the report status to " + status;
        };

        activityLogService.log(
            principal.getName(), admin.getRole(), "UPDATED", "Safety Reports",
            "\"" + report.getTitle() + "\" — " + actionLabel,
            request.getRemoteAddr(), "Success"
        );

        Map<String, String> response = new HashMap<>();
        response.put("message", "Status updated successfully");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/priority")
    @ResponseBody
    public ResponseEntity<?> updatePriority(
            @PathVariable Long id,
            @RequestParam String priority,
            Principal principal,
            HttpServletRequest request) {

        // Check role - only ADMIN, SECRETARY, SECRETARIAT STAFF can update priority
        String username = principal.getName();
        AdminUser admin = adminUserService.getAdminByEmail(username);
        String role = admin.getRole();
        
        if (!canManageReports(role)) {
            return ResponseEntity.status(403).body(Map.of("error", "Insufficient permissions"));
        }

        SafetyReports report = safetyReportService.getReportById(id);
        if (report == null) {
            return ResponseEntity.notFound().build();
        }

        report.setPriority(priority);
        safetyReportService.saveReport(report);

        activityLogService.log(
            principal.getName(), admin.getRole(), "UPDATED", "Safety Reports",
            "Updated priority to " + priority + " for report: \"" + report.getTitle() + "\"",
            request.getRemoteAddr(), "Success"
        );

        Map<String, String> response = new HashMap<>();
        response.put("message", "Priority updated successfully");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/remarks")
    @ResponseBody
    public ResponseEntity<?> addRemarks(
            @PathVariable Long id,
            @RequestParam String remarks,
            Principal principal,
            HttpServletRequest request) {

        // Check role - only ADMIN, SECRETARY, SECRETARIAT STAFF can add remarks
        String username = principal.getName();
        AdminUser admin = adminUserService.getAdminByEmail(username);
        String role = admin.getRole();
        
        if (!canManageReports(role)) {
            return ResponseEntity.status(403).body(Map.of("error", "Insufficient permissions"));
        }

        SafetyReports report = safetyReportService.getReportById(id);
        if (report == null) {
            activityLogService.log(
                principal.getName(), admin.getRole(), "UPDATED", "Safety Reports",
                "Tried to add remarks to safety report #" + id + " but it was not found",
                request.getRemoteAddr(), "Failed"
            );
            return ResponseEntity.notFound().build();
        }

        report.setHandlerRemarks(remarks);
        safetyReportService.saveReport(report);

        activityLogService.log(
                principal.getName(), admin.getRole(), "UPDATED", "Safety Reports",
                "Added handler remarks to the report: \"" + report.getTitle() + "\"",
                request.getRemoteAddr(), "Success"
            );

        Map<String, String> response = new HashMap<>();
        response.put("message", "Remarks added successfully");
        return ResponseEntity.ok(response);
    }

    // Helper method to check if role can manage reports
    private boolean canManageReports(String role) {
        return "ADMIN".equalsIgnoreCase(role) || 
               "SECRETARY".equalsIgnoreCase(role) || 
               "SECRETARIAT STAFF".equalsIgnoreCase(role);
    }

    private String calculateResponseTime(SafetyReports report) {
        LocalDateTime approvedTime = report.getDateHandled();
        LocalDateTime resolvedTime = LocalDateTime.now();
        
        if (approvedTime == null) {
            return "N/A";
        }
        
        Duration duration = Duration.between(approvedTime, resolvedTime);
        long hours = duration.toHours();
        long minutes = duration.toMinutesPart();
        long days = duration.toDays();
        
        if (days > 0) {
            return days + " day(s)";
        } else if (hours > 0) {
            return hours + " hour(s) and " + minutes + " minute(s)";
        } else {
            return minutes + " minute(s)";
        }
    }
}