package com.example.demo.services;

import com.example.demo.model.Blotter;
import com.example.demo.repository.BlotterRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class BlotterService {

    private final BlotterRepository blotterRepository;

    public BlotterService(BlotterRepository blotterRepository) {
        this.blotterRepository = blotterRepository;
    }

    public List<Blotter> getAllBlotters() {
        return blotterRepository.findAllOrderByCreatedAtDesc();
    }

    public List<Blotter> getByStatus(String status) {
        return blotterRepository.findByStatus(status);
    }

    public Blotter getBlotterById(Long id) {
        return blotterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Blotter not found with id: " + id));
    }

    public void saveBlotter(Blotter blotter) {
        if (blotter.getCreatedAt() == null) {
            blotter.setCreatedAt(LocalDateTime.now());
        }
        blotter.setUpdatedAt(LocalDateTime.now());
        blotterRepository.save(blotter);
    }

    public void updateStatus(Long id, String status, String updatedBy) {
        Blotter blotter = getBlotterById(id);
        blotter.setStatus(status);
        blotter.setUpdatedBy(updatedBy);
        blotter.setUpdatedAt(LocalDateTime.now());
        blotterRepository.save(blotter);
    }

    public void archiveBlotter(Long id, String archivedBy) {
        Blotter blotter = getBlotterById(id);
        blotter.setStatus("ARCHIVE");
        blotter.setUpdatedBy(archivedBy);
        blotter.setUpdatedAt(LocalDateTime.now());
        blotterRepository.save(blotter);
    }

    public List<Blotter> searchBlotters(String query) {
        if (query == null || query.trim().isEmpty()) {
            return getAllBlotters();
        }
        return blotterRepository.search(query.toLowerCase());
    }

    public void deleteBlotter(Long id) {
        blotterRepository.deleteById(id);
    }

    public long countAll() {
        return blotterRepository.count();
    }

    public long countByStatus(String status) {
    return blotterRepository.countByStatus(status);
}
}