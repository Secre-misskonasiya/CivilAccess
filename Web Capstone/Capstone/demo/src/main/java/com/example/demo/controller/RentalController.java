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
    public String rentalsPage(@RequestParam(defaultValue = "incoming") String tab,
                            Model model, Principal principal) {
        if (principal != null) {
            AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
            if (admin != null) {
                model.addAttribute("currentUser",   admin.getName());
                model.addAttribute("currentrole",   admin.getRole());
                model.addAttribute("accountStatus", admin.getEmpstatus());
            } else {
                model.addAttribute("currentUser", principal.getName());
                model.addAttribute("currentrole", "USER");
            }
        } else {
            model.addAttribute("currentUser", "Guest");
            model.addAttribute("currentrole", "USER");
        }

        model.addAttribute("currentTab", tab);
        rentalService.updateOverdueStatus();

        // Fetch once, reuse for both lists and counts
        List<Rental> incoming = rentalService.getIncomingRentals();
        List<Rental> active   = rentalService.getActiveRentals();
        List<Rental> overdue  = rentalService.getOverdueRentals();
        List<Rental> returned = rentalService.getReturnedRentals();
        List<Rental> archived = rentalService.getArchivedRentals();

        model.addAttribute("incomingRentals", incoming);
        model.addAttribute("activeRentals",   active);
        model.addAttribute("overdueRentals",  overdue);
        model.addAttribute("returnedRentals", returned);
        model.addAttribute("archivedRentals", archived);

        model.addAttribute("incomingCount", incoming.size());
        model.addAttribute("activeCount",   active.size());
        model.addAttribute("overdueCount",  overdue.size());
        model.addAttribute("returnedCount", returned.size());
        model.addAttribute("archiveCount",  archived.size());

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
    public ResponseEntity<Map<String, Object>> pollUpdates(
            @RequestParam(defaultValue = "incoming") String tab) {
        rentalService.updateOverdueStatus();

        // Fetch all lists once — reuse for both tab data and counts
        List<Rental> incoming = rentalService.getIncomingRentals();
        List<Rental> active   = rentalService.getActiveRentals();
        List<Rental> overdue  = rentalService.getOverdueRentals();
        List<Rental> returned = rentalService.getReturnedRentals();
        List<Rental> archived = rentalService.getArchivedRentals();

        Map<String, Object> response = new HashMap<>();

        // Only send the current tab's full data — saves bandwidth
        switch (tab.toLowerCase()) {
            case "incoming" -> response.put("incoming", sortByNewest(incoming));
            case "active"   -> response.put("active",   sortByNewest(active));
            case "overdue"  -> response.put("overdue",  sortByNewest(overdue));
            case "returned" -> response.put("returned", sortByNewest(returned));
            case "archive"  -> response.put("archive",  sortByNewest(archived));
        }

        // Always include counts so all tab badges stay fresh
        Map<String, Integer> counts = new HashMap<>();
        counts.put("incoming", incoming.size());
        counts.put("active",   active.size());
        counts.put("overdue",  overdue.size());
        counts.put("returned", returned.size());
        counts.put("archive",  archived.size());
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