package com.example.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.model.SystemLogs;

public interface SystemLogsRepository extends JpaRepository<SystemLogs, Long> {

    List<SystemLogs> findByModuleAndStatusOrderByTimestampDesc(String module, String status);

    long countByModuleAndStatus(String module, String status);
}