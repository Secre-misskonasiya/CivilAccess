package com.example.demo.controller;

import com.example.demo.model.ContactHelpRequest;
import com.example.demo.model.ContactMessage;
import com.example.demo.model.ResidentUser;
import com.example.demo.repository.ContactHelpRepository;
import com.example.demo.services.ContactMessageService;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Controller
public class ResidentContactController {

    @Autowired
    private ContactHelpRepository contactHelpRepository;

    @Autowired
    private ContactMessageService contactMessageService;

    // ─────────────────────────────────────────────────────────────────────
    //  Helpers
    // ─────────────────────────────────────────────────────────────────────

    /** All requests belonging to this resident's email, newest first.
     *  Uses findAll() since ContactHelpRepository has no findByEmail* method. */
    private List<ContactHelpRequest> getRequestsByEmail(String email) {
        return contactHelpRepository.findAll()
                .stream()
                .filter(r -> email.equals(r.getEmail()))
                .sorted(Comparator.comparing(ContactHelpRequest::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    /** Serialise a request for the frontend, normalising ARCHIVED → RESOLVED. */
    private Map<String, Object> toMap(ContactHelpRequest req) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",                req.getId());
        m.put("type",              req.getType());
        m.put("message",           req.getMessage());
        m.put("status",            "ARCHIVED".equals(req.getStatus()) ? "RESOLVED" : req.getStatus());
        m.put("createdAt",         req.getCreatedAt());
        m.put("resolvedAt",        req.getResolvedAt());
        m.put("adminLastViewedAt", req.getAdminLastViewedAt());
        return m;
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Page
    // ─────────────────────────────────────────────────────────────────────

    @GetMapping("/resident/contact")
    public String residentContactPage(HttpSession session) {
        // if (session.getAttribute("resident") == null) {
        //     return "redirect:/resident-login";
        // }
        return "ResidentContact";
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Current user
    // ─────────────────────────────────────────────────────────────────────

    @GetMapping("/api/resident/me")
    @ResponseBody
    public ResponseEntity<?> getCurrentResident(HttpSession session) {
        ResidentUser resident = (ResidentUser) session.getAttribute("resident");
        if (resident == null) return ResponseEntity.status(401).body("Not authenticated");

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id",        resident.getId());
        data.put("firstName", resident.getFirstName());
        data.put("lastName",  resident.getLastName());
        data.put("email",     resident.getEmail());
        data.put("phone",     resident.getMobileNumber());
        return ResponseEntity.ok(data);
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Contact help requests
    // ─────────────────────────────────────────────────────────────────────

    @GetMapping("/api/resident/contact-requests")
    @ResponseBody
    public ResponseEntity<?> getMyRequests(HttpSession session) {
        ResidentUser resident = (ResidentUser) session.getAttribute("resident");
        if (resident == null) return ResponseEntity.status(401).body("Not authenticated");

        List<Map<String, Object>> result = getRequestsByEmail(resident.getEmail())
                .stream().map(this::toMap).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @PostMapping("/api/resident/contact-requests")
    @ResponseBody
    public ResponseEntity<?> createRequest(
            @RequestBody Map<String, String> body,
            HttpSession session) {

        ResidentUser resident = (ResidentUser) session.getAttribute("resident");
        if (resident == null) return ResponseEntity.status(401).body("Not authenticated");

        // One active ticket at a time — uses existing findByStatus()
        boolean hasActive = contactHelpRepository.findByStatus("INCOMING")
                .stream().anyMatch(r -> resident.getEmail().equals(r.getEmail()));

        if (hasActive) {
            return ResponseEntity.status(409)
                    .body("You already have an ongoing request. Please wait for it to be resolved.");
        }

        String message = body.getOrDefault("message", "").trim();
        if (message.isEmpty()) return ResponseEntity.badRequest().body("Message is required.");

        String fullName = (resident.getFirstName() + " " + resident.getLastName()).trim();
        if (fullName.isEmpty()) fullName = resident.getEmail();

        ContactHelpRequest req = new ContactHelpRequest();
        req.setName(fullName);
        req.setEmail(resident.getEmail());
        req.setPhoneNumber(resident.getMobileNumber() != null ? resident.getMobileNumber() : "");
        req.setType(body.getOrDefault("type", "General Inquiry"));
        req.setMessage(message);
        req.setStatus("INCOMING");
        req.setCreatedAt(LocalDateTime.now());

        ContactHelpRequest saved = contactHelpRepository.save(req);
        return ResponseEntity.ok(toMap(saved));
    }

    @GetMapping("/api/resident/contact-requests/{id}/status")
    @ResponseBody
    public ResponseEntity<?> getRequestStatus(
            @PathVariable Long id,
            HttpSession session) {

        ResidentUser resident = (ResidentUser) session.getAttribute("resident");
        if (resident == null) return ResponseEntity.status(401).body("Not authenticated");

        Optional<ContactHelpRequest> opt = contactHelpRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        ContactHelpRequest req = opt.get();
        if (!resident.getEmail().equals(req.getEmail())) return ResponseEntity.status(403).body("Forbidden");

        String displayStatus = "ARCHIVED".equals(req.getStatus()) ? "RESOLVED" : req.getStatus();
        return ResponseEntity.ok(Map.of("status", displayStatus));
    }

    @PostMapping("/api/resident/contact-requests/{id}/mark-viewed")
    @ResponseBody
    public ResponseEntity<?> markViewed(
            @PathVariable Long id,
            HttpSession session) {

        ResidentUser resident = (ResidentUser) session.getAttribute("resident");
        if (resident == null) return ResponseEntity.status(401).body("Not authenticated");

        Optional<ContactHelpRequest> opt = contactHelpRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        ContactHelpRequest req = opt.get();
        if (!resident.getEmail().equals(req.getEmail())) return ResponseEntity.status(403).body("Forbidden");

        req.setAdminLastViewedAt(LocalDateTime.now());
        contactHelpRepository.save(req);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Messages
    // ─────────────────────────────────────────────────────────────────────

    @GetMapping("/api/resident/contact-requests/{id}/messages")
    @ResponseBody
    public ResponseEntity<?> getMessages(
            @PathVariable Long id,
            HttpSession session) {

        ResidentUser resident = (ResidentUser) session.getAttribute("resident");
        if (resident == null) return ResponseEntity.status(401).body("Not authenticated");

        Optional<ContactHelpRequest> opt = contactHelpRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        if (!resident.getEmail().equals(opt.get().getEmail())) return ResponseEntity.status(403).body("Forbidden");

        List<Map<String, Object>> result = contactMessageService.getMessagesByRequestId(id)
                .stream().map(m -> {
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("id",         m.getId());
                    entry.put("message",    m.getMessage());
                    entry.put("senderType", m.getSenderType());
                    entry.put("senderName", m.getSenderName());
                    entry.put("createdAt",  m.getCreatedAt());
                    return entry;
                }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @PostMapping("/api/resident/contact-requests/{id}/messages")
    @ResponseBody
    public ResponseEntity<?> sendMessage(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            HttpSession session) {

        ResidentUser resident = (ResidentUser) session.getAttribute("resident");
        if (resident == null) return ResponseEntity.status(401).body("Not authenticated");

        Optional<ContactHelpRequest> opt = contactHelpRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        ContactHelpRequest req = opt.get();
        if (!resident.getEmail().equals(req.getEmail())) return ResponseEntity.status(403).body("Forbidden");

        if ("RESOLVED".equals(req.getStatus()) || "ARCHIVED".equals(req.getStatus())) {
            return ResponseEntity.status(409).body("Request is already resolved.");
        }

        String text = body.getOrDefault("message", "").trim();
        if (text.isEmpty()) return ResponseEntity.badRequest().body("Message cannot be empty.");

        String fullName = (resident.getFirstName() + " " + resident.getLastName()).trim();
        if (fullName.isEmpty()) fullName = resident.getEmail();

        ContactMessage saved = contactMessageService.saveMessage(id, text, "RESIDENT", fullName);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id",         saved.getId());
        result.put("message",    saved.getMessage());
        result.put("senderType", saved.getSenderType());
        result.put("senderName", saved.getSenderName());
        result.put("createdAt",  saved.getCreatedAt());
        return ResponseEntity.ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Admin profile pictures (avatars in chat)
    // ─────────────────────────────────────────────────────────────────────

    @GetMapping("/api/resident/admin-profiles")
    @ResponseBody
    public ResponseEntity<?> getAdminProfiles(
            @RequestParam(value = "names", required = false, defaultValue = "") String names,
            HttpSession session) {

        if (session.getAttribute("resident") == null) return ResponseEntity.status(401).body("Not authenticated");
        if (names.isBlank()) return ResponseEntity.ok(Collections.emptyList());

        // Falls back to initials in the UI — wire up AdminUserRepository here if needed
        List<Map<String, Object>> result = Arrays.stream(names.split(","))
                .filter(n -> !n.isBlank())
                .map(n -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("name",           n.trim());
                    m.put("profilePicture", null);
                    return m;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }
}