package com.example.demo.repository;

import com.example.demo.model.SafetyReports;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SafetyReportRepository extends JpaRepository<SafetyReports, Long> {

    @Query("SELECT s.status, COUNT(s) FROM SafetyReports s GROUP BY s.status")
    List<Object[]> countGroupedByStatus();
}