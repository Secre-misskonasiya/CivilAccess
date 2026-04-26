package com.example.demo.services;

import com.example.demo.model.Announcements;
import com.example.demo.repository.AnnouncementsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

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
        return repository.findTopByOrderByDatePostedDesc().orElse(null);    
    }
}