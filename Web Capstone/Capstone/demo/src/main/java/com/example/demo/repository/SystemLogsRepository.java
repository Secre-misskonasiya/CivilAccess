package com.example.demo.repository;

import com.example.demo.model.SystemLogs;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SystemLogsRepository extends JpaRepository<SystemLogs, Long> {
}