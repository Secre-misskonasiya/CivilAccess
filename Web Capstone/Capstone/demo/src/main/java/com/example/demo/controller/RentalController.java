package com.example.demo.controller;

import com.example.demo.model.AdminUser;
import com.example.demo.model.Rental;
import com.example.demo.services.AdminUserServices;
import com.example.demo.services.RentalService;
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
@RequestMapping("/rentals")
public class RentalController {

    private final RentalService rentalService;
    private final AdminUserServices adminUserService;

    public RentalController(RentalService rentalService, AdminUserServices adminUserService) {
        this.rentalService = rentalService;
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public String rentalsPage(@RequestParam(defaultValue = "incoming") String tab, Model model, Principal principal) {
        // Get current authenticated user
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

        model.addAttribute("currentTab", tab);
        
        rentalService.updateOverdueStatus();
        
        model.addAttribute("incomingCount", rentalService.getIncomingRentals().size());
        model.addAttribute("activeCount", rentalService.getActiveRentals().size());
        model.addAttribute("overdueCount", rentalService.getOverdueRentals().size());
        model.addAttribute("returnedCount", rentalService.getReturnedRentals().size());
        model.addAttribute("archiveCount", rentalService.getArchivedRentals().size());

        return "rentals";
    }

    // Helper method to sort rentals by newest first (by createdAt)
    private List<Rental> sortByNewest(List<Rental> rentals) {
        if (rentals == null || rentals.isEmpty()) {
            return rentals;
        }
        return rentals.stream()
                .sorted(Comparator.comparing(Rental::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }

    // API endpoints for each status tab - WITH SORTING
    @GetMapping("/api/incoming")
    @ResponseBody
    public ResponseEntity<List<Rental>> getIncomingRentals() {
        return ResponseEntity.ok(sortByNewest(rentalService.getIncomingRentals()));
    }

    @GetMapping("/api/active")
    @ResponseBody
    public ResponseEntity<List<Rental>> getActiveRentals() {
        rentalService.updateOverdueStatus();
        return ResponseEntity.ok(sortByNewest(rentalService.getActiveRentals()));
    }
    
    @GetMapping("/api/overdue")
    @ResponseBody
    public ResponseEntity<List<Rental>> getOverdueRentals() {
        rentalService.updateOverdueStatus();
        return ResponseEntity.ok(sortByNewest(rentalService.getOverdueRentals()));
    }

    @GetMapping("/api/returned")
    @ResponseBody
    public ResponseEntity<List<Rental>> getReturnedRentals() {
        return ResponseEntity.ok(sortByNewest(rentalService.getReturnedRentals()));
    }

    @GetMapping("/api/archive")
    @ResponseBody
    public ResponseEntity<List<Rental>> getArchivedRentals() {
        return ResponseEntity.ok(sortByNewest(rentalService.getArchivedRentals()));
    }

    @GetMapping("/{id}")
    @ResponseBody
    public ResponseEntity<Rental> getRental(@PathVariable Long id) {
        return rentalService.getRentalById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/create")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> createRental(@RequestBody Rental rental) {
        try {
            rental.setStatus("INCOMING");
            Rental created = rentalService.createRental(rental);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("rental", created);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PutMapping("/{id}/approve")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> approveRental(@PathVariable Long id) {
        try {
            rentalService.approveRental(id);
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

    @PutMapping("/{id}/return")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> returnRental(@PathVariable Long id, Principal principal) {
        try {
            String processedBy = getCurrentUserName(principal);
            rentalService.returnRental(id, processedBy);
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

    @PutMapping("/{id}/archive")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> archiveRental(@PathVariable Long id, Principal principal) {
        try {
            String processedBy = getCurrentUserName(principal);
            rentalService.archiveRental(id, processedBy);
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
        rentalService.updateOverdueStatus();
        Map<String, Integer> counts = new HashMap<>();
        counts.put("incoming", rentalService.getIncomingRentals().size());
        counts.put("active", rentalService.getActiveRentals().size());
        counts.put("overdue", rentalService.getOverdueRentals().size());
        counts.put("returned", rentalService.getReturnedRentals().size());
        counts.put("archive", rentalService.getArchivedRentals().size());
        return ResponseEntity.ok(counts);
    }

    @GetMapping("/api/poll")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> pollUpdates() {
        rentalService.updateOverdueStatus();
        Map<String, Object> response = new HashMap<>();
        response.put("incoming", sortByNewest(rentalService.getIncomingRentals()));
        response.put("active", sortByNewest(rentalService.getActiveRentals()));
        response.put("overdue", sortByNewest(rentalService.getOverdueRentals()));
        response.put("returned", sortByNewest(rentalService.getReturnedRentals()));
        response.put("archive", sortByNewest(rentalService.getArchivedRentals()));
        
        Map<String, Integer> counts = new HashMap<>();
        counts.put("incoming", rentalService.getIncomingRentals().size());
        counts.put("active", rentalService.getActiveRentals().size());
        counts.put("overdue", rentalService.getOverdueRentals().size());
        counts.put("returned", rentalService.getReturnedRentals().size());
        counts.put("archive", rentalService.getArchivedRentals().size());
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