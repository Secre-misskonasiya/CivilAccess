package com.example.demo.controller;

import com.example.demo.model.Announcements;
import com.example.demo.repository.AnnouncementsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/resident/announcements")
public class ResidentAnnouncementsController {

    @Autowired
    private AnnouncementsRepository announcementsRepository;

    /**
     * Main page — shows ALL announcements EXCEPT archived ones.
     * HIGH priority items sorted to top, then newest first within each group.
     */
    @GetMapping
    public String residentAnnouncements(Model model) {
        List<Announcements> visible = announcementsRepository.findAll()
                .stream()
                // exclude ARCHIVED only — everything else is shown
                .filter(a -> a.getStatus() == null || !a.getStatus().equalsIgnoreCase("ARCHIVED"))
                .sorted(Comparator
                        .<Announcements, Integer>comparing(
                                a -> "HIGH".equalsIgnoreCase(a.getPriority()) ? 0 : 1
                        )
                        .thenComparing(
                                Comparator.comparing(
                                        Announcements::getDatePosted,
                                        Comparator.nullsLast(Comparator.reverseOrder())
                                )
                        )
                )
                .collect(Collectors.toList());

        model.addAttribute("announcements", visible);
        return "ResidentAnnouncement";
    }

    /**
     * JSON polling endpoint — same logic as above.
     */
    @GetMapping("/api/feed")
    @ResponseBody
    public List<Announcements> feedApi() {
        return announcementsRepository.findAll()
                .stream()
                .filter(a -> a.getStatus() == null || !a.getStatus().equalsIgnoreCase("ARCHIVED"))
                .sorted(Comparator
                        .<Announcements, Integer>comparing(
                                a -> "HIGH".equalsIgnoreCase(a.getPriority()) ? 0 : 1
                        )
                        .thenComparing(
                                Comparator.comparing(
                                        Announcements::getDatePosted,
                                        Comparator.nullsLast(Comparator.reverseOrder())
                                )
                        )
                )
                .collect(Collectors.toList());
    }

    /**
     * Single announcement JSON — used by the "View full" modal.
     */
    @GetMapping("/{id}")
    @ResponseBody
    public Announcements getOne(@PathVariable Long id) {
        return announcementsRepository.findById(id).orElse(null);
    }

    /**
     * DEBUG endpoint - check what's actually in your database
     * Visit: /resident/announcements/debug
     */
    @GetMapping("/debug")
    @ResponseBody
    public String debug() {
        List<Announcements> all = announcementsRepository.findAll();
        StringBuilder sb = new StringBuilder();
        sb.append("<h2>All Announcements in Database:</h2>");
        sb.append("<table border='1' cellpadding='8' cellspacing='0'>");
        sb.append("<tr><th>ID</th><th>Title</th><th>Priority</th><th>Status</th><th>Date Posted</th></tr>");
        
        for (Announcements a : all) {
            sb.append("<tr>");
            sb.append("<td>").append(a.getId()).append("</td>");
            sb.append("<td>").append(a.getTitle()).append("</td>");
            sb.append("<td>").append(a.getPriority()).append("</td>");
            sb.append("<td>").append(a.getStatus()).append("</td>");
            sb.append("<td>").append(a.getDatePosted()).append("</td>");
            sb.append("</tr>");
        }
        sb.append("</table>");
        
        sb.append("<h3>Filtered Announcements (what should show):</h3>");
        List<Announcements> filtered = announcementsRepository.findAll()
                .stream()
                .filter(a -> a.getStatus() == null || !a.getStatus().equalsIgnoreCase("ARCHIVED"))
                .collect(Collectors.toList());
        
        sb.append("<ul>");
        for (Announcements a : filtered) {
            sb.append("<li>").append(a.getTitle()).append(" - Priority: ").append(a.getPriority()).append(" - Status: ").append(a.getStatus()).append("</li>");
        }
        sb.append("</ul>");
        
        return sb.toString();
    }
}