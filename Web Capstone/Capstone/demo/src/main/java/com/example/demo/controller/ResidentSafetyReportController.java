package com.example.demo.controller;

import com.example.demo.model.ResidentUser;
import com.example.demo.dto.SafetyReportView;
import com.example.demo.model.SafetyReports;
import com.example.demo.repository.ResidentUserRepository;
import com.example.demo.repository.SafetyReportRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.security.Principal;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/resident/safety-reports")
public class ResidentSafetyReportController {

    @Autowired
    private SafetyReportRepository safetyReportRepository;

    @Autowired
    private ResidentUserRepository residentUserRepository;

    /**
     * Main page for residents to view safety reports.
     *
     * Visibility rules:
     * - INCOMING ("For Verification") and REJECTED reports are private —
     *   only visible to the resident who submitted them.
     * - All other statuses (APPROVED, IN_PROGRESS, RESOLVED) are visible
     *   to every resident, but the reporter's identity is anonymized
     *   unless the viewer is the one who submitted it.
     * - ARCHIVED reports are hidden from residents entirely.
     */
    @GetMapping
    public String residentSafetyReports(Model model, Principal principal) {
        UUID currentResidentId = resolveResidentId(principal);

        List<SafetyReportView> visibleReports = safetyReportRepository.findAll()
                .stream()
                .filter(r -> isVisibleToResident(r, currentResidentId))
                .sorted(Comparator
                        .comparing(SafetyReports::getDateSubmitted, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(r -> SafetyReportView.from(r, isOwner(r, currentResidentId)))
                .collect(Collectors.toList());

        model.addAttribute("reports", visibleReports);
        model.addAttribute("currentResidentId", currentResidentId);
        return "ResidentSafetyReport";
    }

    /**
     * JSON polling endpoint for real-time updates. Same rules as the page above.
     */
    @GetMapping("/api/feed")
    @ResponseBody
    public List<SafetyReportView> feedApi(Principal principal) {
        UUID currentResidentId = resolveResidentId(principal);

        return safetyReportRepository.findAll()
                .stream()
                .filter(r -> isVisibleToResident(r, currentResidentId))
                .sorted(Comparator
                        .comparing(SafetyReports::getDateSubmitted, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(r -> SafetyReportView.from(r, isOwner(r, currentResidentId)))
                .collect(Collectors.toList());
    }

    private UUID resolveResidentId(Principal principal) {
        if (principal == null) return null;
        return residentUserRepository.findByEmail(principal.getName())
                .map(ResidentUser::getId)
                .orElse(null);
    }

    private boolean isOwner(SafetyReports report, UUID currentResidentId) {
        return currentResidentId != null && currentResidentId.equals(report.getReporterId());
    }

    /**
     * Statuses that are private to the reporting resident. Everything else
     * is publicly visible (with identity anonymized for non-owners).
     */
    private boolean isPrivateStatus(String status) {
        String s = status != null ? status.toUpperCase() : "INCOMING";
        return s.equals("INCOMING") || s.equals("REJECTED") || s.equals("CANCELLED");
    }

    private boolean isVisibleToResident(SafetyReports report, UUID currentResidentId) {
        String status = report.getStatus() != null ? report.getStatus().toUpperCase() : "INCOMING";

        // Archived reports are hidden from residents entirely
        if (status.equals("ARCHIVED")) {
            return false;
        }

        // Private statuses: only the reporter can see their own
        if (isPrivateStatus(status)) {
            return isOwner(report, currentResidentId);
        }

        // Everything else is public (identity anonymization handled separately)
        return true;
    }
}