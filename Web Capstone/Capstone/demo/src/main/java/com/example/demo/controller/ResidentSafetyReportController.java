package com.example.demo.controller;

import com.example.demo.model.SafetyReports;
import com.example.demo.repository.SafetyReportRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/resident/safety-reports")
public class ResidentSafetyReportController {

    @Autowired
    private SafetyReportRepository safetyReportRepository;

    /**
     * Main page for residents to view safety reports.
     * Shows only reports that are visible to residents:
     * - RESOLVED reports (visible to everyone)
     * - IN_PROGRESS reports (only if created by the current user)
     * - INCOMING/APPROVED reports (only if created by the current user)
     * - ARCHIVED reports are hidden
     */
    @GetMapping
    public String residentSafetyReports(Model model, 
                                        @org.springframework.web.bind.annotation.RequestParam(required = false) Long userId) {
        
        // For now, get current user from session or parameter
        // This would need to be replaced with actual authentication
        Long currentUserId = userId; // In production, get from SecurityContext or session
        
        List<SafetyReports> visibleReports = safetyReportRepository.findAll()
                .stream()
                // Filter out archived reports
                .filter(r -> r.getStatus() == null || !r.getStatus().equalsIgnoreCase("ARCHIVED"))
                // Filter by visibility rules
                .filter(r -> isVisibleToResident(r, currentUserId))
                .sorted(Comparator
                        .comparing(SafetyReports::getDateSubmitted, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());

        model.addAttribute("reports", visibleReports);
        return "ResidentSafetyReport";
    }

    /**
     * Check if a report is visible to the current resident
     */
    private boolean isVisibleToResident(SafetyReports report, Long currentUserId) {
        String status = report.getStatus() != null ? report.getStatus().toUpperCase() : "INCOMING";
        
        // RESOLVED reports are visible to everyone
        if (status.equals("RESOLVED")) {
            return true;
        }
        
        // For non-resolved reports, only show if the current user created them
        // This requires linking the report to a resident user ID
        // If you have a residentId field in SafetyReports, uncomment the line below
        // return report.getResidentId() != null && report.getResidentId().equals(currentUserId);
        
        // For now, show all non-archived reports (for testing)
        // In production, you should filter by the current user's ID
        return true;
    }

    /**
     * JSON polling endpoint for real-time updates
     * Returns only visible reports for residents
     */
    @GetMapping("/api/feed")
    @ResponseBody
    public List<SafetyReports> feedApi(@org.springframework.web.bind.annotation.RequestParam(required = false) Long userId) {
        Long currentUserId = userId;
        
        return safetyReportRepository.findAll()
                .stream()
                .filter(r -> r.getStatus() == null || !r.getStatus().equalsIgnoreCase("ARCHIVED"))
                .filter(r -> isVisibleToResident(r, currentUserId))
                .sorted(Comparator
                        .comparing(SafetyReports::getDateSubmitted, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }
}