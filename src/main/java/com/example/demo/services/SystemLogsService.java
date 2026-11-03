package com.example.demo.services;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.demo.model.SystemLogs;
import com.example.demo.repository.SystemLogsRepository;

@Service
public class SystemLogsService {

    private static final String ASSISTANCE_MODULE = "Admin Assistance";

    @Autowired
    private SystemLogsRepository repository;

    public List<SystemLogs> getAllLogs() {
        return repository.findAll();
    }

    public SystemLogs saveLog(SystemLogs log) {
        if (log.getTimestamp() == null) {
            log.setTimestamp(LocalDateTime.now());
        }
        return repository.save(log);
    }

    public List<SystemLogs> getLogsByUser(Long userId) {
        return repository.findAll().stream()
                .filter(log -> log.getUserId().equals(userId))
                .toList();
    }

    // ===== NEW: Admin Assistance Requests =====

    public SystemLogs saveAssistanceRequest(Long userId, String requesterName, String requesterRole, String message) {
        SystemLogs log = new SystemLogs();
        log.setUserId(userId);
        log.setAction("REQUESTED");
        log.setModule(ASSISTANCE_MODULE);
        log.setDescription(message);
        log.setRequesterName(requesterName);
        log.setRequesterRole(requesterRole);
        log.setStatus("PENDING");
        // saveLog() will stamp the timestamp
        return saveLog(log);
    }

    public List<SystemLogs> getPendingAssistanceRequests() {
        return repository.findByModuleAndStatusOrderByTimestampDesc(ASSISTANCE_MODULE, "PENDING");
    }

    public long countPendingAssistanceRequests() {
        return repository.countByModuleAndStatus(ASSISTANCE_MODULE, "PENDING");
    }

    public void resolveAssistanceRequest(Long id) {
        repository.findById(id).ifPresent(log -> {
            log.setStatus("RESOLVED");
            repository.save(log);
        });
    }
}