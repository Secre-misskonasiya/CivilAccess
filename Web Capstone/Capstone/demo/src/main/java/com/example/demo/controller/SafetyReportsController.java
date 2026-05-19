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
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
        model.addAttribute("newAdmin", new AdminUser());
        model.addAttribute("currentUser", name);
        model.addAttribute("currentrole", role);

        List<SafetyReports> allReports = safetyReportService.getAllReports();

        // INCOMING: sort by dateSubmitted DESC (newest first)
        List<SafetyReports> incomingReports = allReports.stream()
                .filter(r -> "INCOMING".equalsIgnoreCase(r.getStatus()))
                .sorted(Comparator
                        .comparing(SafetyReports::getDateSubmitted, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Comparator.comparing(SafetyReports::getId, Comparator.reverseOrder())))
                .collect(Collectors.toList());

        // APPROVED: sort by dateSubmitted DESC (newest first)
        List<SafetyReports> approvedReports = allReports.stream()
                .filter(r -> "APPROVED".equalsIgnoreCase(r.getStatus()))
                .sorted(Comparator
                        .comparing(SafetyReports::getDateSubmitted, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Comparator.comparing(SafetyReports::getId, Comparator.reverseOrder())))
                .collect(Collectors.toList());

        // IN PROGRESS: sort by dateSubmitted DESC (newest first)
        List<SafetyReports> inProgressReports = allReports.stream()
                .filter(r -> "IN_PROGRESS".equalsIgnoreCase(r.getStatus()) || "INPROGRESS".equalsIgnoreCase(r.getStatus()))
                .sorted(Comparator
                        .comparing(SafetyReports::getDateSubmitted, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Comparator.comparing(SafetyReports::getId, Comparator.reverseOrder())))
                .collect(Collectors.toList());

        // RESOLVED: sort by dateHandled DESC (most recently resolved first)
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

        // ARCHIVE: sort by dateHandled DESC (most recently archived first)
        List<SafetyReports> archivedReports = allReports.stream()
                .filter(r -> "ARCHIVED_RESOLVED".equalsIgnoreCase(r.getStatus())
                          || "ARCHIVED_UNRESOLVED".equalsIgnoreCase(r.getStatus()))
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
        model.addAttribute("archivedReports", archivedReports);

        model.addAttribute("incomingCount", incomingReports.size());
        model.addAttribute("approvedCount", approvedReports.size());
        model.addAttribute("inProgressCount", inProgressReports.size());
        model.addAttribute("resolvedCount", resolvedReports.size());
        model.addAttribute("archivedCount", archivedReports.size());

        model.addAttribute("currentTab", tab);

        return "SafetyReports";
    }

    @GetMapping("/{id}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getReport(@PathVariable Long id) {

        SafetyReports report = safetyReportService.getReportById(id);
        if (report == null) {
            return ResponseEntity.notFound().build();
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

        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/all")
    @ResponseBody
    public ResponseEntity<List<Map<String, Object>>> getAllReportsForMap() {
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
    public ResponseEntity<Map<String, Object>> pollReports(@RequestParam Long lastId) {
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
        counts.put("archive", allReports.stream()
                .filter(r -> "ARCHIVED_RESOLVED".equalsIgnoreCase(r.getStatus()) || "ARCHIVED_UNRESOLVED".equalsIgnoreCase(r.getStatus())).count());

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

        SafetyReports report = safetyReportService.getReportById(id);
        if (report == null) {
            return ResponseEntity.notFound().build();
        }

        String username = principal.getName();
        AdminUser admin = adminUserService.getAdminByEmail(username);
        
        // Calculate response time from APPROVED to RESOLVED
        String responseTime = calculateResponseTime(report);
        
        // Save resolution details to new columns
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

        SafetyReports report = safetyReportService.getReportById(id);
        if (report == null) {
            activityLogService.log(
                principal.getName(), "ADMIN", "UPDATED", "Safety Reports",
                "Tried to update status of safety report #" + id + " but it was not found",
                request.getRemoteAddr(), "Failed"
            );
            return ResponseEntity.notFound().build();
        }

        String username = principal.getName();
        AdminUser admin = adminUserService.getAdminByEmail(username);

        // Set the new status and timestamp
        report.setStatus(status);
        report.setDateHandled(LocalDateTime.now());

        // Set handler info
        report.setHandledByName(admin.getName());
        report.setHandledByRole(admin.getRole());

        safetyReportService.saveReport(report);

        String actionLabel = switch (status) {
            case "APPROVED"             -> "Approved the report and assigned a handler";
            case "IN_PROGRESS"          -> "Moved the report to In Progress";
            case "RESOLVED"             -> "Marked the report as resolved";
            case "ARCHIVED_RESOLVED"    -> "Archived the resolved report";
            case "ARCHIVED_UNRESOLVED"  -> "Archived the unresolved report";
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

    @PostMapping("/{id}/remarks")
    @ResponseBody
    public ResponseEntity<?> addRemarks(
            @PathVariable Long id,
            @RequestParam String remarks,
            Principal principal,
            HttpServletRequest request) {

        SafetyReports report = safetyReportService.getReportById(id);
        if (report == null) {
            activityLogService.log(
                principal.getName(), "ADMIN", "UPDATED", "Safety Reports",
                "Tried to add remarks to safety report #" + id + " but it was not found",
                request.getRemoteAddr(), "Failed"
            );
            return ResponseEntity.notFound().build();
        }

        report.setHandlerRemarks(remarks);
        safetyReportService.saveReport(report);

        activityLogService.log(
                principal.getName(), "ADMIN", "UPDATED", "Safety Reports",
                "Added handler remarks to the report: \"" + report.getTitle() + "\"",
                request.getRemoteAddr(), "Success"
            );

        Map<String, String> response = new HashMap<>();
        response.put("message", "Remarks added successfully");
        return ResponseEntity.ok(response);
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