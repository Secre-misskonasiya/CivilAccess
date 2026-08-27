package com.example.demo.services;

import java.util.Comparator;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.demo.model.Announcements;
import com.example.demo.repository.AnnouncementsRepository;

@Service
public class AnnouncementsService {

    @Autowired
    private AnnouncementsRepository repository;

    public List<Announcements> getAllAnnouncements() {
        return repository.findAll();
    }

    public Announcements getAnnouncementById(Long id) {
        return repository.findById(id).orElse(null);
    }

    public Announcements saveAnnouncement(Announcements announcement) {
        return repository.save(announcement);
    }

    public void deleteAnnouncement(Long id) {
        repository.deleteById(id);
    }

    public Announcements getLatest() {
        return repository.findAll().stream()
            .filter(a -> !"ARCHIVED".equalsIgnoreCase(a.getStatus()))
            .sorted(Comparator
                .comparing(Announcements::getPriority, (p1, p2) -> {
                    if ("HIGH".equals(p1) && !"HIGH".equals(p2)) return -1;
                    if (!"HIGH".equals(p1) && "HIGH".equals(p2)) return 1;
                    return 0;
                })
                .thenComparing(Announcements::getDatePosted, Comparator.nullsLast(Comparator.reverseOrder())))
            .findFirst()
            .orElse(null);
    }

    public long countActive() {
        return repository.countByStatusNotIgnoreCase("ARCHIVED");
    }
}