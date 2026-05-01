package com.example.demo.controller;

import com.example.demo.model.AdminUser;
import com.example.demo.model.ContactHelpRequest;
import com.example.demo.model.ContactMessage;
import com.example.demo.services.AdminUserServices;
import com.example.demo.services.ActivityLogService;
import com.example.demo.services.ContactHelpService;
import com.example.demo.services.ContactMessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import jakarta.servlet.http.HttpServletRequest;
import java.security.Principal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/contact-help")
public class ContactHelpController {

    @Autowired private ContactHelpService service;
    @Autowired private AdminUserServices adminUserService;
    @Autowired private ContactMessageService messageService;
    @Autowired private ActivityLogService activityLogService;

    @PersistenceContext
    private EntityManager entityManager;

    // --- viewContactHelp, getRequest, getResidentAvatar, debugResidentsTable,
    //     markAsRead, getUnreadStatus, checkNewMessages, debugUnread,
    //     getCount, getIncomingRequests — all unchanged, keep as-is ---

    @PutMapping("/{id}/status")
    @ResponseBody
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            Principal principal,
            HttpServletRequest request) {

        ContactHelpRequest req = service.getRequestById(id);
        if (req == null) return ResponseEntity.notFound().build();

        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());

        req.setStatus(status);
        if ("RESOLVED".equals(status) && req.getResolvedAt() == null) {
            req.setResolvedAt(LocalDateTime.now());
            req.setResolvedBy(admin.getName());
        }
        service.saveRequest(req);

        activityLogService.log(
            admin.getName(), admin.getRole(),
            "RESOLVED".equals(status) ? "RESOLVED" : "UPDATED",
            "Contact Help",
            truncate("Set contact request #" + id + " (" + nvl(req.getName(), "unknown") + ") status to " + status),
            request.getRemoteAddr(), "Success"
        );

        return ResponseEntity.ok(Map.of("message", "Status updated successfully"));
    }

    @PostMapping("/{id}/messages")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> sendMessage(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload,
            Principal principal,
            HttpServletRequest request) {

        ContactHelpRequest req = service.getRequestById(id);
        if (req == null) return ResponseEntity.notFound().build();

        String messageText = payload.get("message");
        if (messageText == null || messageText.isBlank()) return ResponseEntity.badRequest().build();

        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
        ContactMessage saved = messageService.saveMessage(id, messageText, "ADMIN", admin.getName());

        activityLogService.log(
            admin.getName(), admin.getRole(), "REPLIED", "Contact Help",
            truncate("Sent reply on contact request #" + id + " (" + nvl(req.getName(), "unknown") + ")"),
            request.getRemoteAddr(), "Success"
        );

        return ResponseEntity.ok(messageToMap(saved));
    }

    // --- getMessages — unchanged ---

    // ── helpers ────────────────────────────────────────────────────────────────

    private boolean hasUnreadMessages(ContactHelpRequest req) {
        LocalDateTime lastViewed = req.getAdminLastViewedAt();
        if (lastViewed == null) return true;
        List<ContactMessage> messages = messageService.getMessagesByRequestId(req.getId());
        LocalDateTime latest = null;
        if (messages != null) {
            for (ContactMessage msg : messages) {
                if ("RESIDENT".equals(msg.getSenderType()) && msg.getCreatedAt() != null) {
                    if (latest == null || msg.getCreatedAt().isAfter(latest)) latest = msg.getCreatedAt();
                }
            }
        }
        if (latest == null && req.getCreatedAt() != null) latest = req.getCreatedAt();
        return latest != null && latest.isAfter(lastViewed);
    }

    private String nvl(String value, String fallback) {
        return value != null ? value : fallback;
    }

    private String truncate(String text) {
        if (text == null) return null;
        return text.length() > 250 ? text.substring(0, 250) + "..." : text;
    }

    private Map<String, Object> messageToMap(ContactMessage msg) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM dd, yyyy hh:mm a");
        Map<String, Object> m = new HashMap<>();
        m.put("id",           msg.getId());
        m.put("message",      msg.getMessage());
        m.put("senderType",   msg.getSenderType());
        m.put("senderName",   msg.getSenderName());
        m.put("createdAt",    msg.getCreatedAt() != null ? msg.getCreatedAt().format(fmt) : "");
        m.put("rawCreatedAt", msg.getCreatedAt() != null ? msg.getCreatedAt().toString()  : "");
        return m;
    }
}