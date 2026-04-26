package com.example.demo.services;

import com.example.demo.model.SafetyReports;
import com.example.demo.repository.SafetyReportRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SafetyReportService {

    @Autowired
    private SafetyReportRepository repository;

    public List<SafetyReports> getAllReports() {
        return repository.findAll();
    }

    public SafetyReports getReportById(Long id) {
        return repository.findById(id).orElse(null);
    }

    public SafetyReports saveReport(SafetyReports report) {
        return repository.save(report);
    }

    public Map<String, Long> getStatusCounts() {
    Map<String, Long> counts = new HashMap<>();
    for (Object[] row : repository.countGroupedByStatus()) {
        String key = row[0] != null ? row[0].toString().toLowerCase().trim() : "unknown";
        counts.put(key, (Long) row[1]);
    }
    return counts;
}
}