package com.example.demo.services;

import com.example.demo.model.SosReports;
import com.example.demo.repository.SosReportsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SosReportsService {

    @Autowired
    private SosReportsRepository repository;

    public List<SosReports> getAllReports() {
        return repository.findAll();
    }

    public SosReports getReportById(Long id) {
        return repository.findById(id).orElse(null);
    }

    public SosReports saveReport(SosReports report) {
        return repository.save(report);
    }

    public long countByStatus(String status) {
        return repository.findAll().stream()
                .filter(r -> status.equals(r.getStatus()))
                .count();
    }

    public Page<SosReports> getReportsByStatus(String status, Pageable pageable) {
        // Filter by status and always sort latest first
        List<SosReports> filtered = repository.findAll().stream()
                .filter(r -> status.equals(r.getStatus()))
                .sorted(Comparator.comparing(SosReports::getDateReported,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());

        // Manual pagination
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), filtered.size());

        if (start > filtered.size()) {
            return new PageImpl<>(List.of(), pageable, filtered.size());
        }

        List<SosReports> pageContent = filtered.subList(start, end);
        return new PageImpl<>(pageContent, pageable, filtered.size());
    }

    /**
     * Returns all SOS reports with the given status, ordered by dateReported descending.
     * Used by the real-time polling endpoint.
     */
    public List<SosReports> getReportsByStatusList(String status) {
        return repository.findAll().stream()
                .filter(r -> status.equals(r.getStatus()))
                .sorted(Comparator.comparing(SosReports::getDateReported,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    public long countThisMonth() {
        LocalDateTime startOfMonth = LocalDateTime.now()
                .withDayOfMonth(1)
                .withHour(0)
                .withMinute(0)
                .withSecond(0)
                .withNano(0);
        return repository.countByDateReportedAfter(startOfMonth);
    }

}