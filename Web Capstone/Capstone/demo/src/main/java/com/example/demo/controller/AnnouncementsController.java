package com.example.demo.controller;

import com.example.demo.model.AdminUser;
import com.example.demo.model.Announcements;
import com.example.demo.services.AdminUserServices;
import com.example.demo.services.AnnouncementsService;
import com.example.demo.services.ActivityLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/announcements")
public class AnnouncementsController {

    @Autowired private AnnouncementsService announcementsService;
    @Autowired private AdminUserServices adminUserService;
    @Autowired private ActivityLogService activityLogService;

    @GetMapping
    public String viewAnnouncements(
            @RequestParam(defaultValue = "announcements") String tab,
            Principal principal,
            Model model) {

        String username = principal.getName();
        AdminUser admin = adminUserService.getAdminByEmail(username);
                if ("Archived".equalsIgnoreCase(admin.getEmpstatus())) {
                return "redirect:/logout";
            }
        model.addAttribute("newAdmin", new AdminUser());
        model.addAttribute("currentUser", admin.getName());
        model.addAttribute("currentrole", admin.getRole());
        model.addAttribute("currentstatus", admin.getEmpstatus());

        List<Announcements> all = announcementsService.getAllAnnouncements();

        // Sort active announcements: HIGH priority first, then by date newest first
        List<Announcements> active = all.stream()
                .filter(a -> !"ARCHIVED".equalsIgnoreCase(a.getStatus()))
                .sorted(Comparator
                    .comparing(Announcements::getPriority, 
                        (p1, p2) -> {
                            // HIGH priority first
                            if ("HIGH".equals(p1) && !"HIGH".equals(p2)) return -1;
                            if (!"HIGH".equals(p1) && "HIGH".equals(p2)) return 1;
                            return 0;
                        })
                    .thenComparing(Announcements::getDatePosted, 
                        Comparator.nullsLast(Comparator.reverseOrder()))) // newest first
                .collect(Collectors.toList());

        // Sort archived announcements: by date newest first
        List<Announcements> archived = all.stream()
                .filter(a -> "ARCHIVED".equalsIgnoreCase(a.getStatus()))
                .sorted(Comparator.comparing(Announcements::getDatePosted, 
                    Comparator.nullsLast(Comparator.reverseOrder()))) // newest first
                .collect(Collectors.toList());

        model.addAttribute("announcements", active);
        model.addAttribute("archivedAnnouncements", archived);
        model.addAttribute("currentTab", tab);

        return "Announcements";
    }

    // =========================================================
    // POLLING ENDPOINT - Sorted by date/time
    // =========================================================
    @GetMapping("/api/poll")
    @ResponseBody
    public Map<String, Object> pollAnnouncements() {
        Map<String, Object> response = new HashMap<>();
        
        List<Announcements> all = announcementsService.getAllAnnouncements();
        
        // Active announcements - sorted: HIGH priority first, then newest date first
        List<Announcements> active = all.stream()
                .filter(a -> !"ARCHIVED".equalsIgnoreCase(a.getStatus()))
                .sorted(Comparator
                    .comparing(Announcements::getPriority, 
                        (p1, p2) -> {
                            if ("HIGH".equals(p1) && !"HIGH".equals(p2)) return -1;
                            if (!"HIGH".equals(p1) && "HIGH".equals(p2)) return 1;
                            return 0;
                        })
                    .thenComparing(Announcements::getDatePosted, 
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
        
        // Archived announcements - sorted: newest date first
        List<Announcements> archived = all.stream()
                .filter(a -> "ARCHIVED".equalsIgnoreCase(a.getStatus()))
                .sorted(Comparator.comparing(Announcements::getDatePosted, 
                    Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
        
        response.put("activeAnnouncements", active.stream().map(a -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", a.getId());
            map.put("title", a.getTitle());
            map.put("content", a.getContent());
            map.put("priority", a.getPriority());
            map.put("datePosted", a.getDatePosted() != null ? a.getDatePosted().toString() : null);
            map.put("image", a.getImage());
            map.put("status", a.getStatus());
            return map;
        }).collect(Collectors.toList()));
        
        response.put("archivedAnnouncements", archived.stream().map(a -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", a.getId());
            map.put("title", a.getTitle());
            map.put("content", a.getContent());
            map.put("priority", a.getPriority());
            map.put("datePosted", a.getDatePosted() != null ? a.getDatePosted().toString() : null);
            map.put("image", a.getImage());
            map.put("status", a.getStatus());
            return map;
        }).collect(Collectors.toList()));
        
        response.put("activeCount", active.size());
        response.put("archivedCount", archived.size());
        
        return response;
    }

    @GetMapping("/{id}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getAnnouncement(@PathVariable Long id) {
        Announcements a = announcementsService.getAnnouncementById(id);
        if (a == null) return ResponseEntity.notFound().build();

        Map<String, Object> response = new HashMap<>();
        response.put("id",         a.getId());
        response.put("title",      a.getTitle()      != null ? a.getTitle()      : "N/A");
        response.put("content",    a.getContent()    != null ? a.getContent()    : "N/A");
        response.put("image",      a.getImage()      != null ? a.getImage()      : null);
        response.put("priority",   a.getPriority()   != null ? a.getPriority()   : "N/A");
        response.put("status",     a.getStatus()     != null ? a.getStatus()     : "ACTIVE");
        response.put("datePosted", a.getDatePosted() != null ? a.getDatePosted().toString() : null);
        response.put("createdBy",  a.getCreatedBy()  != null ? a.getCreatedBy()  : null);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/priority")
    @ResponseBody
    public ResponseEntity<?> updatePriority(
            @PathVariable Long id,
            @RequestParam String priority,
            Principal principal,
            HttpServletRequest request) {

        Announcements a = announcementsService.getAnnouncementById(id);
        if (a == null) return ResponseEntity.notFound().build();

        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
        a.setPriority(priority);
        announcementsService.saveAnnouncement(a);

        activityLogService.log(
            admin.getName(), admin.getRole(), "UPDATED", "Announcements",
            truncate("Changed priority of \"" + a.getTitle() + "\" to " + priority),
            request.getRemoteAddr(), "Success"
        );

        return ResponseEntity.ok(Map.of("message", "Priority updated successfully", "priority", priority));
    }

    @PostMapping("/create")
    @ResponseBody
    public ResponseEntity<?> createAnnouncement(
            @RequestBody Announcements announcement,
            Principal principal,
            HttpServletRequest request) {

        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());

        announcement.setCreatedBy(admin.getId());
        announcement.setDatePosted(LocalDateTime.now());
        announcement.setStatus("ACTIVE");
        if (announcement.getPriority() == null) announcement.setPriority("NORMAL");

        Announcements saved = announcementsService.saveAnnouncement(announcement);

        activityLogService.log(
            admin.getName(), admin.getRole(), "CREATED", "Announcements",
            truncate("Posted a new announcement: \"" + saved.getTitle() + "\""),
            request.getRemoteAddr(), "Success"
        );

        return ResponseEntity.ok(Map.of("message", "Announcement created successfully", "id", saved.getId()));
    }

    @PutMapping("/{id}")
    @ResponseBody
    public ResponseEntity<?> updateAnnouncement(
            @PathVariable Long id,
            @RequestBody Announcements announcement,
            Principal principal,
            HttpServletRequest request) {

        Announcements existing = announcementsService.getAnnouncementById(id);
        if (existing == null) return ResponseEntity.notFound().build();

        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());

        existing.setTitle(announcement.getTitle());
        existing.setContent(announcement.getContent());
        existing.setPriority(announcement.getPriority());
        existing.setImage(announcement.getImage());
        announcementsService.saveAnnouncement(existing);

        activityLogService.log(
            admin.getName(), admin.getRole(), "UPDATED", "Announcements",
            truncate("Edited the announcement: \"" + existing.getTitle() + "\""),
            request.getRemoteAddr(), "Success"
        );

        return ResponseEntity.ok(Map.of("message", "Announcement updated successfully"));
    }

    @PutMapping("/{id}/archive")
    @ResponseBody
    public ResponseEntity<?> archiveAnnouncement(
            @PathVariable Long id,
            Principal principal,
            HttpServletRequest request) {

        Announcements a = announcementsService.getAnnouncementById(id);
        if (a == null) return ResponseEntity.notFound().build();

        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
        a.setStatus("ARCHIVED");
        announcementsService.saveAnnouncement(a);

        activityLogService.log(
            admin.getName(), admin.getRole(), "ARCHIVED", "Announcements",
            truncate("Archived the announcement: \"" + a.getTitle() + "\""),
            request.getRemoteAddr(), "Success"
        );

        return ResponseEntity.ok(Map.of("message", "Announcement archived successfully"));
    }

    @PutMapping("/{id}/restore")
    @ResponseBody
    public ResponseEntity<?> restoreAnnouncement(
            @PathVariable Long id,
            Principal principal,
            HttpServletRequest request) {

        Announcements a = announcementsService.getAnnouncementById(id);
        if (a == null) return ResponseEntity.notFound().build();

        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
        a.setStatus("ACTIVE");
        announcementsService.saveAnnouncement(a);

        activityLogService.log(
            admin.getName(), admin.getRole(), "RESTORED", "Announcements",
            truncate("Restored the announcement: \"" + a.getTitle() + "\""),
            request.getRemoteAddr(), "Success"
        );

        return ResponseEntity.ok(Map.of("message", "Announcement restored successfully"));
    }

    private String truncate(String text) {
        if (text == null) return null;
        return text.length() > 250 ? text.substring(0, 250) + "..." : text;
    }
}