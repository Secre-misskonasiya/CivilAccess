
package com.example.demo.controller;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.server.ResponseStatusException;

import com.example.demo.dto.SafetyReportView;
import com.example.demo.model.SafetyReports;
import com.example.demo.repository.SafetyReportRepository;

import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/resident/safety-reports")
public class ResidentSafetyReportController {

    @Autowired
    private SafetyReportRepository safetyReportRepository;

    @GetMapping
    public String residentSafetyReports(Model model, HttpSession session) {

        UUID currentResidentId = resolveResidentId(session);

        boolean isAdminAsResident =
                session.getAttribute("adminAsResidentId") != null;

        if (currentResidentId == null && !isAdminAsResident) {
            return "redirect:/resident-login";
        }

        List<SafetyReportView> visibleReports =
                safetyReportRepository.findAll()
                        .stream()
                        .filter(report ->
                                isVisibleToResident(report, currentResidentId))
                        .sorted(Comparator.comparing(
                                SafetyReports::getDateSubmitted,
                                Comparator.nullsLast(
                                        Comparator.reverseOrder())))
                        .map(report -> SafetyReportView.from(
                                report,
                                isOwner(report, currentResidentId)))
                        .collect(Collectors.toList());

        model.addAttribute("reports", visibleReports);
        model.addAttribute("currentResidentId", currentResidentId);

        return "ResidentSafetyReport";
    }

    @GetMapping("/api/feed")
    @ResponseBody
    public List<SafetyReportView> feedApi(HttpSession session) {

        UUID currentResidentId = resolveResidentId(session);

        boolean isAdminAsResident =
                session.getAttribute("adminAsResidentId") != null;

        if (currentResidentId == null && !isAdminAsResident) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Please log in first.");
        }

        return safetyReportRepository.findAll()
                .stream()
                .filter(report ->
                        isVisibleToResident(report, currentResidentId))
                .sorted(Comparator.comparing(
                        SafetyReports::getDateSubmitted,
                        Comparator.nullsLast(
                                Comparator.reverseOrder())))
                .map(report -> SafetyReportView.from(
                        report,
                        isOwner(report, currentResidentId)))
                .collect(Collectors.toList());
    }

    /**
     * Gets the logged-in resident UUID from the HTTP session.
     */
    private UUID resolveResidentId(HttpSession session) {

        Object sessionId = session.getAttribute("residentId");

        if (sessionId == null) {
            System.out.println("No residentId found in session.");
            return null;
        }

        try {
            UUID residentId = UUID.fromString(sessionId.toString());

            System.out.println(
                    "Resolved Resident UUID from session: " + residentId);

            return residentId;

        } catch (IllegalArgumentException e) {
            System.out.println(
                    "Invalid residentId in session: " + sessionId);
            return null;
        }
    }

    /**
     * Checks whether the logged-in resident owns the report.
     */
    private boolean isOwner(
            SafetyReports report,
            UUID currentResidentId) {

        if (report == null || currentResidentId == null) {
            return false;
        }

        return currentResidentId.equals(report.getUserId());
    }

    /**
     * Matches the React Native visibility rules.
     */
    private boolean isVisibleToResident(
            SafetyReports report,
            UUID currentResidentId) {

        if (report == null) {
            return false;
        }

        String status = report.getStatus() != null
                ? report.getStatus().toUpperCase().trim()
                : "";

        // Hidden from residents regardless of ownership.
        if (status.equals("UNVERIFIED")
                || status.equals("ARCHIVED_UNRESOLVED")) {
            return false;
        }

        // Private reports: owner only.
        if (status.equals("INCOMING")
                || status.equals("APPROVED")
                || status.equals("IN_PROGRESS")) {
            return isOwner(report, currentResidentId);
        }

        // Public reports.
        return status.equals("VERIFIED")
                || status.equals("RESOLVED")
                || status.equals("ARCHIVED_RESOLVED");
    }
}
