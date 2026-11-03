package com.example.demo.controller;

import com.example.demo.model.AdminUser;
import com.example.demo.model.Reservation;
import com.example.demo.services.AdminUserServices;
import com.example.demo.services.ReservationService;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/reservations")
public class ReservationController {

    private final ReservationService reservationService;
    private final AdminUserServices adminUserService;

    public ReservationController(ReservationService reservationService, AdminUserServices adminUserService) {
        this.reservationService = reservationService;
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public String reservationsPage(@RequestParam(defaultValue = "incoming") String tab, Model model, Principal principal) {
        // Get current authenticated user - EXACTLY like BlotterController
        if (principal != null) {
            String username = principal.getName();
            AdminUser admin = adminUserService.getAdminByEmail(username);
            if (admin != null) {
                model.addAttribute("currentUser", admin.getName());
                model.addAttribute("currentrole", admin.getRole());
                model.addAttribute("currentstatus", "ACTIVE");
                model.addAttribute("accountStatus", admin.getEmpstatus());
            } else {
                model.addAttribute("currentUser", username);
                model.addAttribute("currentrole", "USER");
                model.addAttribute("currentstatus", "ACTIVE");
            }
        } else {
            model.addAttribute("currentUser", "Guest");
            model.addAttribute("currentrole", "USER");
            model.addAttribute("currentstatus", "ACTIVE");
        }

        // Pass the current tab to the view for highlighting
        model.addAttribute("currentTab", tab);
        
        // Pass counts for badges
        model.addAttribute("incomingCount", reservationService.getIncomingReservations().size());
        model.addAttribute("approvedCount", reservationService.getApprovedReservations().size());
        model.addAttribute("inProgressCount", reservationService.getInProgressReservations().size());
        model.addAttribute("resolvedCount", reservationService.getResolvedReservations().size());
        model.addAttribute("archivedCount", reservationService.getArchivedReservations().size());
        
        return "reservations";
    }

    // Helper method to sort reservations by newest first (by createdAt)
    private List<Reservation> sortByNewest(List<Reservation> reservations) {
        return reservations.stream()
                .sorted(Comparator.comparing(Reservation::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }

    // API endpoints for each status tab - WITH SORTING
    @GetMapping("/api/incoming")
    @ResponseBody
    public ResponseEntity<List<Reservation>> getIncomingReservations() {
        return ResponseEntity.ok(sortByNewest(reservationService.getIncomingReservations()));
    }

    @GetMapping("/api/approved")
    @ResponseBody
    public ResponseEntity<List<Reservation>> getApprovedReservations() {
        return ResponseEntity.ok(sortByNewest(reservationService.getApprovedReservations()));
    }

    @GetMapping("/api/inprogress")
    @ResponseBody
    public ResponseEntity<List<Reservation>> getInProgressReservations() {
        return ResponseEntity.ok(sortByNewest(reservationService.getInProgressReservations()));
    }

    @GetMapping("/api/resolved")
    @ResponseBody
    public ResponseEntity<List<Reservation>> getResolvedReservations() {
        return ResponseEntity.ok(sortByNewest(reservationService.getResolvedReservations()));
    }

    @GetMapping("/api/archive")
    @ResponseBody
    public ResponseEntity<List<Reservation>> getArchivedReservations() {
        return ResponseEntity.ok(sortByNewest(reservationService.getArchivedReservations()));
    }

    @GetMapping("/{id}")
    @ResponseBody
    public ResponseEntity<Reservation> getReservation(@PathVariable Long id) {
        return reservationService.getReservationById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/create")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> createReservation(@RequestBody Reservation reservation) {
        try {
            reservation.setStatus("INCOMING");
            Reservation created = reservationService.createReservation(reservation);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("reservation", created);
            return ResponseEntity.ok(response);
        } catch (IllegalStateException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PutMapping("/{id}/status")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> updateStatus(@PathVariable Long id, @RequestParam String status, Principal principal) {
        try {
            String processedBy = getCurrentUserName(principal);
            reservationService.updateStatus(id, status, processedBy);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/api/counts")
    @ResponseBody
    public ResponseEntity<Map<String, Integer>> getCounts() {
        Map<String, Integer> counts = new HashMap<>();
        counts.put("incoming", reservationService.getIncomingReservations().size());
        counts.put("approved", reservationService.getApprovedReservations().size());
        counts.put("inprogress", reservationService.getInProgressReservations().size());
        counts.put("resolved", reservationService.getResolvedReservations().size());
        counts.put("archive", reservationService.getArchivedReservations().size());
        return ResponseEntity.ok(counts);
    }

    @GetMapping("/api/poll")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> pollUpdates() {
        Map<String, Object> response = new HashMap<>();
        response.put("incoming", sortByNewest(reservationService.getIncomingReservations()));
        response.put("approved", sortByNewest(reservationService.getApprovedReservations()));
        response.put("inprogress", sortByNewest(reservationService.getInProgressReservations()));
        response.put("resolved", sortByNewest(reservationService.getResolvedReservations()));
        response.put("archive", sortByNewest(reservationService.getArchivedReservations()));
        
        Map<String, Integer> counts = new HashMap<>();
        counts.put("incoming", reservationService.getIncomingReservations().size());
        counts.put("approved", reservationService.getApprovedReservations().size());
        counts.put("inprogress", reservationService.getInProgressReservations().size());
        counts.put("resolved", reservationService.getResolvedReservations().size());
        counts.put("archive", reservationService.getArchivedReservations().size());
        response.put("counts", counts);
        
        return ResponseEntity.ok(response);
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