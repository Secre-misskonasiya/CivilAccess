package com.example.demo.services;

import com.example.demo.model.SystemLogs;
import com.example.demo.repository.SystemLogsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class SystemLogsService {

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
}