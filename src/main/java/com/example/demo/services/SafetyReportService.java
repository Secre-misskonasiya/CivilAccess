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

    public String generateSafetyReportsSummary() {
    List<SafetyReports> all = repository.findAll();
    if (all.isEmpty()) return "No safety reports on record.";

    long total      = all.size();
    long incoming   = all.stream().filter(r -> "INCOMING".equalsIgnoreCase(r.getStatus())).count();
    long inProgress = all.stream().filter(r -> "IN_PROGRESS".equalsIgnoreCase(r.getStatus())).count();
    long resolved   = all.stream().filter(r -> "RESOLVED".equalsIgnoreCase(r.getStatus())).count();
    long high       = all.stream().filter(r -> "HIGH".equalsIgnoreCase(r.getPriority())).count();
    long medium     = all.stream().filter(r -> "MEDIUM".equalsIgnoreCase(r.getPriority())).count();
    long low        = all.stream().filter(r -> "LOW".equalsIgnoreCase(r.getPriority())).count();

    // Top 3 most common types
    Map<String, Long> typeCounts = all.stream()
        .filter(r -> r.getType() != null)
        .collect(java.util.stream.Collectors.groupingBy(
            SafetyReports::getType, java.util.stream.Collectors.counting()));

    String topTypes = typeCounts.entrySet().stream()
        .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
        .limit(3)
        .map(e -> e.getKey() + " (" + e.getValue() + ")")
        .collect(java.util.stream.Collectors.joining(", "));

    // Top 3 most reported locations
    Map<String, Long> locationCounts = all.stream()
        .filter(r -> r.getLocation() != null)
        .collect(java.util.stream.Collectors.groupingBy(
            SafetyReports::getLocation, java.util.stream.Collectors.counting()));

    String topLocations = locationCounts.entrySet().stream()
        .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
        .limit(3)
        .map(e -> e.getKey() + " (" + e.getValue() + " reports)")
        .collect(java.util.stream.Collectors.joining(", "));

    return String.format(
        "SAFETY REPORTS SUMMARY:\n" +
        "- Total reports: %d\n" +
        "- Incoming: %d | In Progress: %d | Resolved: %d\n" +
        "- Priority: High=%d, Medium=%d, Low=%d\n" +
        "- Most common incident types: %s\n" +
        "- Most reported locations: %s",
        total, incoming, inProgress, resolved,
        high, medium, low,
        topTypes.isEmpty() ? "None" : topTypes,
        topLocations.isEmpty() ? "None" : topLocations
    );
}
}