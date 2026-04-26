package com.example.demo.controller;

import com.example.demo.model.AdminUser;
import com.example.demo.model.Announcements;
import com.example.demo.services.AdminUserServices;
import com.example.demo.services.AnnouncementsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/announcements")
public class AnnouncementsController {

    @Autowired
    private AnnouncementsService announcementsService;
    
    @Autowired
    private AdminUserServices adminUserService;

    @GetMapping
    public String viewAnnouncements(
            @RequestParam(defaultValue = "announcements") String tab,
            Principal principal,
            Model model) {
        
        // Get the logged-in user information
        String username = principal.getName();
        AdminUser admin = adminUserService.getAdminByEmail(username);
        
        String name = admin.getName();
        String role = admin.getRole();

        // Add user info to model
        model.addAttribute("newAdmin", new AdminUser());
        model.addAttribute("currentUser", name);
        model.addAttribute("currentrole", role);
        
        // Get all announcements
        List<Announcements> allAnnouncements = announcementsService.getAllAnnouncements();
        
        // Filter announcements by status
        List<Announcements> activeAnnouncements = allAnnouncements.stream()
                .filter(a -> !"ARCHIVED".equalsIgnoreCase(a.getStatus()))
                .collect(Collectors.toList());
        
        List<Announcements> archivedAnnouncements = allAnnouncements.stream()
                .filter(a -> "ARCHIVED".equalsIgnoreCase(a.getStatus()))
                .collect(Collectors.toList());
        model.addAttribute("currentstatus", admin.getEmpstatus());
        model.addAttribute("announcements", activeAnnouncements);
        model.addAttribute("archivedAnnouncements", archivedAnnouncements);
        model.addAttribute("currentTab", tab);
        
        return "Announcements";
    }

    @GetMapping("/{id}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getAnnouncement(@PathVariable Long id) {
        Announcements announcement = announcementsService.getAnnouncementById(id);
        if (announcement == null) {
            return ResponseEntity.notFound().build();
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("id", announcement.getId());
        response.put("title", announcement.getTitle() != null ? announcement.getTitle() : "N/A");
        response.put("content", announcement.getContent() != null ? announcement.getContent() : "N/A");
        response.put("image", announcement.getImage() != null ? announcement.getImage() : null);
        response.put("priority", announcement.getPriority() != null ? announcement.getPriority() : "N/A");
        response.put("status", announcement.getStatus() != null ? announcement.getStatus() : "ACTIVE");
        response.put("datePosted", announcement.getDatePosted() != null ? announcement.getDatePosted().toString() : null);
        response.put("createdBy", announcement.getCreatedBy() != null ? announcement.getCreatedBy() : null);
        
        return ResponseEntity.ok(response);
    }

    // NEW ENDPOINT - Update just the priority of an announcement
    @PutMapping("/{id}/priority")
    @ResponseBody
    public ResponseEntity<?> updatePriority(@PathVariable Long id, @RequestParam String priority) {
        Announcements announcement = announcementsService.getAnnouncementById(id);
        if (announcement == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Update only the priority field
        announcement.setPriority(priority);
        announcementsService.saveAnnouncement(announcement);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Priority updated successfully");
        response.put("priority", priority);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/create")
    @ResponseBody
    public ResponseEntity<?> createAnnouncement(@RequestBody Announcements announcement, Principal principal) {
        String username = principal.getName();
        AdminUser admin = adminUserService.getAdminByEmail(username);
        
        // Set metadata
        announcement.setCreatedBy(admin.getId());
        announcement.setDatePosted(LocalDateTime.now());
        announcement.setStatus("ACTIVE");
        
        if (announcement.getPriority() == null) {
            announcement.setPriority("NORMAL");
        }
        
        Announcements saved = announcementsService.saveAnnouncement(announcement);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Announcement created successfully");
        response.put("id", saved.getId());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @ResponseBody
    public ResponseEntity<?> updateAnnouncement(@PathVariable Long id, @RequestBody Announcements announcement) {
        Announcements existing = announcementsService.getAnnouncementById(id);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        
        existing.setTitle(announcement.getTitle());
        existing.setContent(announcement.getContent());
        existing.setPriority(announcement.getPriority());
        existing.setImage(announcement.getImage());
        
        announcementsService.saveAnnouncement(existing);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Announcement updated successfully");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/archive")
    @ResponseBody
    public ResponseEntity<?> archiveAnnouncement(@PathVariable Long id) {
        Announcements announcement = announcementsService.getAnnouncementById(id);
        if (announcement == null) {
            return ResponseEntity.notFound().build();
        }
        
        announcement.setStatus("ARCHIVED");
        announcementsService.saveAnnouncement(announcement);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Announcement archived successfully");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/restore")
    @ResponseBody
    public ResponseEntity<?> restoreAnnouncement(@PathVariable Long id) {
        Announcements announcement = announcementsService.getAnnouncementById(id);
        if (announcement == null) {
            return ResponseEntity.notFound().build();
        }
        
        announcement.setStatus("ACTIVE");
        announcementsService.saveAnnouncement(announcement);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Announcement restored successfully");
        return ResponseEntity.ok(response);
    }

}