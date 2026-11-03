package com.example.demo.repository;

import com.example.demo.model.SosReports;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;

@Repository
public interface SosReportsRepository extends JpaRepository<SosReports, Long> {
    long countByDateReportedAfter(LocalDateTime date);
}