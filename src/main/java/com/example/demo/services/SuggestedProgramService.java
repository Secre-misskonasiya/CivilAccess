package com.example.demo.services;

import com.example.demo.model.SuggestedProgram;
import com.example.demo.repository.SuggestedProgramRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SuggestedProgramService {

    @Autowired
    private SuggestedProgramRepository repository;

    @Autowired
    private ObjectMapper objectMapper;

    // ── Save from JSON (AI chat) ───────────────────────────────────────────────

    public SuggestedProgram saveSuggestedProgram(String jsonPart, Long programId) throws Exception {
        SuggestedProgram program = objectMapper.readValue(jsonPart, SuggestedProgram.class);
        program.setProgramId(programId);
        program.setStatus("PROCESSING");
        program.setStatusUpdatedAt(LocalDateTime.now());
        return repository.save(program);
    }

    // ── Save manual entry ─────────────────────────────────────────────────────

    public SuggestedProgram saveManualEntry(SuggestedProgram program) {
        if (program.getProgramName() == null || program.getProgramName().isEmpty()) {
            program.setProgramName("Unnamed Program");
        }
        // Only set defaults if this is a new record (no id yet)
        if (program.getId() == null) {
            if (program.getStatus() == null || program.getStatus().isBlank()) {
                program.setStatus("PROCESSING");
            }
            program.setStatusUpdatedAt(LocalDateTime.now());
        }
        return repository.save(program);
    }

    // ── Get all PROCESSING (shown in suggestion list) ─────────────────────────

    /**
     * Returns only programs with status PROCESSING.
     * ADDED and DELETED records are hidden from the list and only
     * visible in the Activity Log.
     */
    public List<SuggestedProgram> getAllSuggestedPrograms() {
        return repository.findAll()
                .stream()
                .filter(p -> "PROCESSING".equals(p.getStatus()))
                .collect(Collectors.toList());
    }

    // ── Get by programId (PROCESSING only) ────────────────────────────────────

    public List<SuggestedProgram> getSuggestedProgramsByProgramId(Long programId) {
        return repository.findByProgramId(programId)
                .stream()
                .filter(p -> "PROCESSING".equals(p.getStatus()))
                .collect(Collectors.toList());
    }

    // ── Soft-delete: sets status = DELETED ───────────────────────────────────

    /**
     * Marks the record as DELETED instead of removing it from the database.
     * The program disappears from the suggestion list but remains visible
     * in the Activity Log.
     */
    public void deleteSuggestedProgram(Long id) {
        repository.findById(id).ifPresent(program -> {
            program.setStatus("DELETED");
            program.setStatusUpdatedAt(LocalDateTime.now());
            repository.save(program);
        });
    }

    // ── Mark as ADDED (called after adding to calendar) ───────────────────────

    /**
     * Marks a suggested program as ADDED once it has been approved
     * and added to the calendar. Called via PATCH /suggested/{id}/mark-added.
     */
    public void markAsAdded(Long id) {
        repository.findById(id).ifPresent(program -> {
            program.setStatus("ADDED");
            program.setStatusUpdatedAt(LocalDateTime.now());
            repository.save(program);
        });
    }

    // ── Activity log: ADDED + DELETED, sorted by most recent ─────────────────

    /**
     * Returns all programs that have been ADDED or DELETED,
     * sorted by statusUpdatedAt descending (most recent first).
     */
    public List<SuggestedProgram> getActivityLog() {
        return repository.findAll()
                .stream()
                .filter(p -> "ADDED".equals(p.getStatus()) || "DELETED".equals(p.getStatus()))
                .sorted(Comparator.comparing(
                        SuggestedProgram::getStatusUpdatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }
}