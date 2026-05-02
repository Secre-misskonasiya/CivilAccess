package com.example.demo.controller;

import com.example.demo.model.AdminUser;
import com.example.demo.model.SosReports;
import com.example.demo.services.ActivityLogService;
import com.example.demo.services.AdminUserServices;
import com.example.demo.services.SosReportsService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/sos-monitoring")
public class SoSMonitoringController {

    @Autowired
    private SosReportsService sosReportsService;

    @Autowired
    private AdminUserServices adminUserService;

    @Autowired
    private ActivityLogService activityLogService;

    @GetMapping
    public String viewSosMonitoring(
            @RequestParam(defaultValue = "incoming") String tab,
            @RequestParam(defaultValue = "0") int page,
            Principal principal,
            Model model) {

        String username = principal.getName();
        AdminUser admin = adminUserService.getAdminByEmail(username);

        String name = admin.getName();
        String role = admin.getRole();

        model.addAttribute("newAdmin", new AdminUser());
        model.addAttribute("currentUser", name);
        model.addAttribute("currentrole", role);

        Set<String> allowedRoles = Set.of("ADMIN", "SECRETARY", "BARANGAY-CAPTAIN");
        if (!allowedRoles.contains(role)) return "redirect:/home";

        int pageSize = 10;
            if ("Archived".equalsIgnoreCase(admin.getEmpstatus())) {
                return "redirect:/logout";
            }
        // Get all counts for badges
        model.addAttribute("incomingCount",   sosReportsService.countByStatus("INCOMING"));
        model.addAttribute("processingCount", sosReportsService.countByStatus("PROCESSING"));
        model.addAttribute("resolvedCount",   sosReportsService.countByStatus("RESOLVED"));
        model.addAttribute("archivedCount",   sosReportsService.countByStatus("ARCHIVED"));
        model.addAttribute("cancelledCount",  sosReportsService.countByStatus("CANCELLED"));

        // Sort by dateReported DESC, then by id DESC (newest first)
        Pageable pageable = PageRequest.of(page, pageSize, Sort.by(Sort.Direction.DESC, "dateReported", "id"));

        switch (tab) {
            case "processing":
                Page<SosReports> processingPage = sosReportsService.getReportsByStatus("PROCESSING", pageable);
                model.addAttribute("processingReports", processingPage.getContent());
                model.addAttribute("processingCurrentPage", processingPage.getNumber());
                model.addAttribute("processingTotalPages", processingPage.getTotalPages());
                break;
            case "resolved":
                Page<SosReports> resolvedPage = sosReportsService.getReportsByStatus("RESOLVED", pageable);
                model.addAttribute("resolvedReports", resolvedPage.getContent());
                model.addAttribute("resolvedCurrentPage", resolvedPage.getNumber());
                model.addAttribute("resolvedTotalPages", resolvedPage.getTotalPages());
                break;
            case "archive":
                Page<SosReports> archivedPage = sosReportsService.getReportsByStatus("ARCHIVED", pageable);
                model.addAttribute("archivedReports", archivedPage.getContent());
                model.addAttribute("archivedCurrentPage", archivedPage.getNumber());
                model.addAttribute("archivedTotalPages", archivedPage.getTotalPages());
                break;
            case "cancelled":
                Page<SosReports> cancelledPage = sosReportsService.getReportsByStatus("CANCELLED", pageable);
                model.addAttribute("cancelledReports", cancelledPage.getContent());
                model.addAttribute("cancelledCurrentPage", cancelledPage.getNumber());
                model.addAttribute("cancelledTotalPages", cancelledPage.getTotalPages());
                break;
            default: // incoming
                Page<SosReports> incomingPage = sosReportsService.getReportsByStatus("INCOMING", pageable);
                model.addAttribute("incomingReports", incomingPage.getContent());
                model.addAttribute("incomingCurrentPage", incomingPage.getNumber());
                model.addAttribute("incomingTotalPages", incomingPage.getTotalPages());
                break;
        }

        model.addAttribute("currentTab", tab);
        return "SoS";
    }

    /**
     * Polling endpoint for INCOMING alerts (sorted newest first)
     */
    @GetMapping("/api/incoming")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getIncomingAlerts(
            @RequestParam(required = false, defaultValue = "0") Long lastId) {

        List<SosReports> incoming = sosReportsService.getReportsByStatusList("INCOMING");

        incoming.sort(Comparator
                .comparing(SosReports::getDateReported, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(Comparator.comparing(SosReports::getId, Comparator.reverseOrder())));

        List<Map<String, Object>> allReports = new ArrayList<>();
        List<Map<String, Object>> newSos = new ArrayList<>();

        for (SosReports report : incoming) {
            Map<String, Object> item = buildReportMap(report);
            allReports.add(item);
            if (report.getId() != null && report.getId() > lastId) {
                newSos.add(item);
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("reports", allReports);
        response.put("newSos", newSos);
        response.put("count", allReports.size());

        return ResponseEntity.ok(response);
    }

    /**
     * Polling endpoint for PROCESSING alerts (sorted newest first)
     */
    @GetMapping("/api/processing")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getProcessingAlerts(
            @RequestParam(required = false, defaultValue = "0") Long lastId) {

        List<SosReports> processing = sosReportsService.getReportsByStatusList("PROCESSING");

        processing.sort(Comparator
                .comparing(SosReports::getDateReported, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(Comparator.comparing(SosReports::getId, Comparator.reverseOrder())));

        List<Map<String, Object>> allReports = new ArrayList<>();
        List<Map<String, Object>> newProcessing = new ArrayList<>();

        for (SosReports report : processing) {
            Map<String, Object> item = buildReportMap(report);
            allReports.add(item);
            if (report.getId() != null && report.getId() > lastId) {
                newProcessing.add(item);
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("reports", allReports);
        response.put("newProcessing", newProcessing);
        response.put("count", allReports.size());

        return ResponseEntity.ok(response);
    }

    /**
     * Polling endpoint for CANCELLED alerts (sorted newest first)
     */
    @GetMapping("/api/cancelled")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getCancelledAlerts(
            @RequestParam(required = false, defaultValue = "0") Long lastId) {

        List<SosReports> cancelled = sosReportsService.getReportsByStatusList("CANCELLED");

        cancelled.sort(Comparator
                .comparing(SosReports::getDateReported, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(Comparator.comparing(SosReports::getId, Comparator.reverseOrder())));

        List<Map<String, Object>> allReports = new ArrayList<>();
        List<Map<String, Object>> newCancelled = new ArrayList<>();

        for (SosReports report : cancelled) {
            Map<String, Object> item = buildReportMap(report);
            allReports.add(item);
            if (report.getId() != null && report.getId() > lastId) {
                newCancelled.add(item);
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("reports", allReports);
        response.put("newCancelled", newCancelled);
        response.put("count", allReports.size());

        return ResponseEntity.ok(response);
    }

    /**
     * Helper method to build report map - INCLUDES LATITUDE AND LONGITUDE
     */
    private Map<String, Object> buildReportMap(SosReports report) {
        Map<String, Object> item = new HashMap<>();
        item.put("id",            report.getId());
        item.put("reporterName",  report.getReporterName()  != null ? report.getReporterName()  : "Unknown");
        item.put("phoneNumber",   report.getPhoneNumber()   != null ? report.getPhoneNumber()   : "N/A");
        item.put("sosType",       report.getSosType()       != null ? report.getSosType()       : "General");
        item.put("location",      report.getLocation()      != null ? report.getLocation()      : "N/A");
        item.put("status",        report.getStatus()        != null ? report.getStatus()        : "N/A");
        item.put("responderName", report.getResponderName() != null ? report.getResponderName() : null);
        item.put("latitude",      report.getLatitude());
        item.put("longitude",     report.getLongitude());
        return item;
    }

    @GetMapping("/{id}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getReport(@PathVariable Long id) {
        SosReports report = sosReportsService.getReportById(id);
        if (report == null) return ResponseEntity.notFound().build();

        Map<String, Object> response = new HashMap<>();
        response.put("id",            report.getId());
        response.put("reporterName",  report.getReporterName()  != null ? report.getReporterName()  : "N/A");
        response.put("phoneNumber",   report.getPhoneNumber()   != null ? report.getPhoneNumber()   : "N/A");
        response.put("sosType",       report.getSosType()       != null ? report.getSosType()       : "N/A");
        response.put("description",   report.getDescription()   != null ? report.getDescription()   : "No description");
        response.put("location",      report.getLocation()      != null ? report.getLocation()      : "N/A");
        response.put("status",        report.getStatus()        != null ? report.getStatus()        : "N/A");
        response.put("responderName", report.getResponderName() != null ? report.getResponderName() : "Not assigned");
        response.put("dateReported",  report.getDateReported()  != null ? report.getDateReported().toString()  : null);
        response.put("dateResolved",  report.getDateResolved()  != null ? report.getDateResolved().toString()  : null);
        response.put("latitude",      report.getLatitude());
        response.put("longitude",     report.getLongitude());

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/status")
        @ResponseBody
        public ResponseEntity<?> updateStatus(
                @PathVariable Long id,
                @RequestParam String status,
                @RequestParam(required = false) String responderName,
                Principal principal,
                HttpServletRequest request) {

            SosReports report = sosReportsService.getReportById(id);
            if (report == null) {
                activityLogService.log(
                    principal.getName(), "ADMIN", "UPDATED", "SOS Monitoring",
                    "Tried to update SOS report #" + id + " but it was not found",
                    request.getRemoteAddr(), "Failed"
                );
                return ResponseEntity.notFound().build();
            }

            AdminUser admin = adminUserService.getAdminByEmail(principal.getName());

            // Set the new status
            report.setStatus(status);

            // Set timestamps and responder based on status
            switch (status) {
                case "PROCESSING" -> {
                    if (responderName != null && !responderName.isEmpty()) {
                        report.setResponderName(responderName);
                    }
                }
                case "RESOLVED" -> {
                    report.setDateResolved(LocalDateTime.now());
                }
            }

            // Save the report
            sosReportsService.saveReport(report);

            String sosActionLabel = switch (status) {
                case "PROCESSING" -> "Dispatched a responder"
                    + (responderName != null && !responderName.isEmpty() ? ": " + responderName : "");
                case "RESOLVED"   -> "Marked the SOS alert as resolved";
                case "CANCELLED"  -> "Cancelled the SOS alert";
                case "ARCHIVED"   -> "Archived the SOS alert";
                default           -> "Updated status to " + status;
            };

            activityLogService.log(
                principal.getName(), admin.getRole(), "UPDATED", "SOS Monitoring",
                "SOS from " + report.getReporterName() + " — " + sosActionLabel,
                request.getRemoteAddr(), "Success"
            );

            Map<String, String> response = new HashMap<>();
            response.put("message", "Status updated successfully");
            return ResponseEntity.ok(response);
        }
}