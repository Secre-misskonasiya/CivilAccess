package com.example.demo.controller;

import com.example.demo.model.AdminUser;
import com.example.demo.model.ContactHelpRequest;
import com.example.demo.model.ContactMessage;
import com.example.demo.services.AdminUserServices;
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
import java.security.Principal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/contact-help")
public class ContactHelpController {

    @Autowired
    private ContactHelpService service;

    @Autowired
    private AdminUserServices adminUserService;

    @Autowired
    private ContactMessageService messageService;

    @PersistenceContext
    private EntityManager entityManager;

    @GetMapping
    public String viewContactHelp(
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

        model.addAttribute("incomingCount", service.countByStatus("INCOMING"));
        model.addAttribute("resolvedCount", service.countByStatus("RESOLVED"));
        model.addAttribute("archivedCount", service.countByStatus("ARCHIVED"));

        List<ContactHelpRequest> allIncoming = service.getRequestsByStatus("INCOMING");
        List<ContactHelpRequest> allResolved = service.getRequestsByStatus("RESOLVED");
        List<ContactHelpRequest> allArchived = service.getRequestsByStatus("ARCHIVED");

        Map<Long, Boolean> unreadStatusMap = new HashMap<>();

        for (ContactHelpRequest req : allIncoming) {
            unreadStatusMap.put(req.getId(), hasUnreadMessages(req));
        }
        for (ContactHelpRequest req : allResolved) {
            unreadStatusMap.put(req.getId(), false);
        }
        for (ContactHelpRequest req : allArchived) {
            unreadStatusMap.put(req.getId(), false);
        }

        // Sort incoming: unread first, then newest first by createdAt
        allIncoming.sort((a, b) -> {
            boolean aUnread = unreadStatusMap.get(a.getId());
            boolean bUnread = unreadStatusMap.get(b.getId());
            if (aUnread && !bUnread) return -1;
            if (!aUnread && bUnread) return 1;
            if (a.getCreatedAt() == null && b.getCreatedAt() == null) return 0;
            if (a.getCreatedAt() == null) return 1;
            if (b.getCreatedAt() == null) return -1;
            return b.getCreatedAt().compareTo(a.getCreatedAt());
        });

        // Sort resolved by resolvedAt (newest first), fallback to createdAt
        allResolved.sort((a, b) -> {
            LocalDateTime aDate = a.getResolvedAt() != null ? a.getResolvedAt() : a.getCreatedAt();
            LocalDateTime bDate = b.getResolvedAt() != null ? b.getResolvedAt() : b.getCreatedAt();
            if (aDate == null && bDate == null) return 0;
            if (aDate == null) return 1;
            if (bDate == null) return -1;
            return bDate.compareTo(aDate);
        });

        // Sort archived by resolvedAt (newest first), fallback to createdAt
        allArchived.sort((a, b) -> {
            LocalDateTime aDate = a.getResolvedAt() != null ? a.getResolvedAt() : a.getCreatedAt();
            LocalDateTime bDate = b.getResolvedAt() != null ? b.getResolvedAt() : b.getCreatedAt();
            if (aDate == null && bDate == null) return 0;
            if (aDate == null) return 1;
            if (bDate == null) return -1;
            return bDate.compareTo(aDate);
        });

        model.addAttribute("unreadStatus",      unreadStatusMap);
        model.addAttribute("incomingRequests",  allIncoming);
        model.addAttribute("resolvedRequests",  allResolved);
        model.addAttribute("archivedRequests",  allArchived);

        model.addAttribute("incomingCurrentPage", 0);
        model.addAttribute("incomingTotalPages",  1);
        model.addAttribute("resolvedCurrentPage", 0);
        model.addAttribute("resolvedTotalPages",  1);
        model.addAttribute("archivedCurrentPage", 0);
        model.addAttribute("archivedTotalPages",  1);

        model.addAttribute("currentTab", tab);

        return "Contact";
    }

    // Helper method to check if there are unread messages
    private boolean hasUnreadMessages(ContactHelpRequest request) {
        LocalDateTime lastViewed = request.getAdminLastViewedAt();

        if (lastViewed == null) return true;

        List<ContactMessage> messages = messageService.getMessagesByRequestId(request.getId());

        LocalDateTime latestResidentMessageTime = null;
        if (messages != null && !messages.isEmpty()) {
            for (ContactMessage msg : messages) {
                if ("RESIDENT".equals(msg.getSenderType()) && msg.getCreatedAt() != null) {
                    if (latestResidentMessageTime == null || msg.getCreatedAt().isAfter(latestResidentMessageTime)) {
                        latestResidentMessageTime = msg.getCreatedAt();
                    }
                }
            }
        }

        if (latestResidentMessageTime == null && request.getCreatedAt() != null) {
            latestResidentMessageTime = request.getCreatedAt();
        }

        if (latestResidentMessageTime == null) return false;

        return latestResidentMessageTime.isAfter(lastViewed);
    }

    @GetMapping("/{id}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getRequest(@PathVariable Long id) {
        ContactHelpRequest request = service.getRequestById(id);
        if (request == null) return ResponseEntity.notFound().build();

        Map<String, Object> response = new HashMap<>();
        response.put("id",          request.getId());
        response.put("name",        nvl(request.getName(),        "N/A"));
        response.put("email",       nvl(request.getEmail(),       "N/A"));
        response.put("phoneNumber", nvl(request.getPhoneNumber(), "N/A"));
        response.put("message",     nvl(request.getMessage(),     "No message"));
        response.put("status",      nvl(request.getStatus(),      "N/A"));
        response.put("type",        nvl(request.getType(),        "General Inquiry"));
        response.put("createdAt",   request.getCreatedAt()  != null ? request.getCreatedAt().toString()  : null);
        response.put("resolvedAt",  request.getResolvedAt() != null ? request.getResolvedAt().toString() : null);
        response.put("resolvedBy",  nvl(request.getResolvedBy(),  null));

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/resident-avatar")
    @ResponseBody
    public ResponseEntity<Map<String, String>> getResidentAvatar(@PathVariable Long id) {
        Map<String, String> response = new HashMap<>();
        
        try {
            ContactHelpRequest request = service.getRequestById(id);
            if (request == null) {
                System.out.println("getResidentAvatar: No request found for id: " + id);
                response.put("avatar_url", "");
                response.put("error", "Request not found");
                return ResponseEntity.ok(response);
            }
            
            String email = request.getEmail();
            System.out.println("getResidentAvatar: Looking for avatar with email: " + email);
            
            if (email == null || email.isEmpty()) {
                System.out.println("getResidentAvatar: No email found in contact request");
                response.put("avatar_url", "");
                response.put("error", "No email");
                return ResponseEntity.ok(response);
            }
            
            // Try different column names that might contain the avatar
            String[] possibleColumns = {"avatar_url", "profile_picture", "avatar", "profile_pic", "image_url"};
            String avatarUrl = null;
            
            for (String column : possibleColumns) {
                try {
                    String sql = "SELECT " + column + " FROM residents WHERE email = :email";
                    Query query = entityManager.createNativeQuery(sql);
                    query.setParameter("email", email);
                    Object result = query.getSingleResult();
                    if (result != null && !result.toString().isEmpty()) {
                        avatarUrl = result.toString();
                        System.out.println("getResidentAvatar: Found avatar in column '" + column + "': " + avatarUrl);
                        break;
                    }
                } catch (Exception e) {
                    // Column doesn't exist or no result, try next column
                    System.out.println("getResidentAvatar: Column '" + column + "' not found or no value");
                }
            }
            
            if (avatarUrl != null && !avatarUrl.isEmpty()) {
                response.put("avatar_url", avatarUrl);
                return ResponseEntity.ok(response);
            } else {
                System.out.println("getResidentAvatar: No avatar found for email: " + email);
                response.put("avatar_url", "");
                response.put("error", "No avatar found");
                return ResponseEntity.ok(response);
            }
            
        } catch (Exception e) {
            System.err.println("getResidentAvatar: Error - " + e.getMessage());
            e.printStackTrace();
            response.put("avatar_url", "");
            response.put("error", e.getMessage());
            return ResponseEntity.ok(response);
        }
    }
    
    // Debug endpoint to check residents table structure
    @GetMapping("/debug/residents-table")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> debugResidentsTable() {
        Map<String, Object> debug = new HashMap<>();
        
        try {
            // Get column names
            String sql = "SELECT column_name FROM information_schema.columns WHERE table_name = 'residents'";
            Query query = entityManager.createNativeQuery(sql);
            List<String> columns = query.getResultList();
            debug.put("columns", columns);
            
            // Get sample data
            String sampleSql = "SELECT * FROM residents LIMIT 5";
            Query sampleQuery = entityManager.createNativeQuery(sampleSql);
            List<Object[]> sampleData = sampleQuery.getResultList();
            debug.put("sample_data", sampleData);
            
        } catch (Exception e) {
            debug.put("error", e.getMessage());
        }
        
        return ResponseEntity.ok(debug);
    }

    @PostMapping("/{id}/mark-read")
    @ResponseBody
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        ContactHelpRequest request = service.getRequestById(id);
        if (request == null) return ResponseEntity.notFound().build();

        request.setAdminLastViewedAt(LocalDateTime.now());
        service.saveRequest(request);

        return ResponseEntity.ok(Map.of("message", "Marked as read"));
    }

    @PutMapping("/{id}/status")
    @ResponseBody
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestParam String status, Principal principal) {
        ContactHelpRequest request = service.getRequestById(id);
        if (request == null) return ResponseEntity.notFound().build();

        request.setStatus(status);
        if ("RESOLVED".equals(status) && request.getResolvedAt() == null) {
            request.setResolvedAt(LocalDateTime.now());
            // Set who resolved it
            if (principal != null) {
                AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
                request.setResolvedBy(admin.getName());
            }
        }
        service.saveRequest(request);

        return ResponseEntity.ok(Map.of("message", "Status updated successfully"));
    }

    @PostMapping("/{id}/messages")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> sendMessage(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload,
            Principal principal) {

        ContactHelpRequest request = service.getRequestById(id);
        if (request == null) return ResponseEntity.notFound().build();

        String messageText = payload.get("message");
        if (messageText == null || messageText.isBlank()) return ResponseEntity.badRequest().build();

        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
        ContactMessage saved = messageService.saveMessage(id, messageText, "ADMIN", admin.getName());

        return ResponseEntity.ok(messageToMap(saved));
    }

    @GetMapping("/{id}/messages")
    @ResponseBody
    public ResponseEntity<List<Map<String, Object>>> getMessages(@PathVariable Long id) {
        ContactHelpRequest request = service.getRequestById(id);
        if (request == null) return ResponseEntity.notFound().build();

        List<Map<String, Object>> messages = messageService
                .getMessagesByRequestId(id)
                .stream()
                .map(this::messageToMap)
                .collect(Collectors.toList());

        return ResponseEntity.ok(messages);
    }

    @GetMapping("/api/count")
    @ResponseBody
    public ResponseEntity<Map<String, Long>> getCount(@RequestParam String tab) {
        long count = switch (tab) {
            case "incoming" -> service.countByStatus("INCOMING");
            case "resolved" -> service.countByStatus("RESOLVED");
            case "archive"  -> service.countByStatus("ARCHIVED");
            default         -> 0L;
        };
        return ResponseEntity.ok(Map.of("count", count));
    }

    @GetMapping("/api/incoming-requests")
    @ResponseBody
    public ResponseEntity<List<Map<String, Object>>> getIncomingRequests() {
        List<ContactHelpRequest> incoming = service.getRequestsByStatus("INCOMING");

        List<Map<String, Object>> result = incoming.stream().map(req -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id",          req.getId());
            m.put("name",        nvl(req.getName(),        "Unknown"));
            m.put("email",       nvl(req.getEmail(),       ""));
            m.put("phoneNumber", nvl(req.getPhoneNumber(), "N/A"));
            m.put("type",        nvl(req.getType(),        "General Inquiry"));
            m.put("message",     nvl(req.getMessage(),     "No message provided"));
            m.put("status",      nvl(req.getStatus(),      "INCOMING"));
            m.put("createdAt",   req.getCreatedAt() != null ? req.getCreatedAt().toString() : null);
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}/unread-status")
    @ResponseBody
    public ResponseEntity<Map<String, Boolean>> getUnreadStatus(@PathVariable Long id) {
        ContactHelpRequest request = service.getRequestById(id);
        if (request == null) return ResponseEntity.notFound().build();

        return ResponseEntity.ok(Map.of("hasUnread", hasUnreadMessages(request)));
    }

    @GetMapping("/{id}/check-new-messages")
    @ResponseBody
    public ResponseEntity<Map<String, Boolean>> checkNewMessages(@PathVariable Long id) {
        ContactHelpRequest request = service.getRequestById(id);
        if (request == null) return ResponseEntity.notFound().build();

        LocalDateTime lastViewed = request.getAdminLastViewedAt();

        if (lastViewed == null) {
            return ResponseEntity.ok(Map.of("hasNewResidentMessage", false));
        }

        List<ContactMessage> messages = messageService.getMessagesByRequestId(id);

        boolean hasNewResidentMessage = false;
        if (messages != null && !messages.isEmpty()) {
            for (ContactMessage msg : messages) {
                if ("RESIDENT".equals(msg.getSenderType()) &&
                    msg.getCreatedAt() != null &&
                    msg.getCreatedAt().isAfter(lastViewed)) {
                    hasNewResidentMessage = true;
                    break;
                }
            }
        }

        return ResponseEntity.ok(Map.of("hasNewResidentMessage", hasNewResidentMessage));
    }

    @GetMapping("/{id}/debug")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> debugUnread(@PathVariable Long id) {
        ContactHelpRequest request = service.getRequestById(id);
        if (request == null) return ResponseEntity.notFound().build();

        Map<String, Object> debug = new HashMap<>();
        debug.put("adminLastViewedAt",  request.getAdminLastViewedAt());
        debug.put("createdAt",          request.getCreatedAt());
        debug.put("hasUnreadMessages",  hasUnreadMessages(request));
        debug.put("status",             request.getStatus());

        List<ContactMessage> messages = messageService.getMessagesByRequestId(id);
        debug.put("messageCount", messages != null ? messages.size() : 0);

        if (messages != null && !messages.isEmpty()) {
            List<Map<String, Object>> msgList = new ArrayList<>();
            for (ContactMessage msg : messages) {
                Map<String, Object> msgMap = new HashMap<>();
                msgMap.put("id",         msg.getId());
                msgMap.put("senderType", msg.getSenderType());
                msgMap.put("createdAt",  msg.getCreatedAt());
                msgList.add(msgMap);
            }
            debug.put("messages", msgList);
        }

        return ResponseEntity.ok(debug);
    }

    private String nvl(String value, String fallback) {
        return value != null ? value : fallback;
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