package com.example.demo.repository;

import com.example.demo.model.ContactHelpRequest;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ContactHelpRepository extends JpaRepository<ContactHelpRequest, Long> {
    long countByStatus(String status);
    Page<ContactHelpRequest> findByStatus(String status, Pageable pageable);
    List<ContactHelpRequest> findByStatus(String status);
    List<ContactHelpRequest> findByStatusOrderByCreatedAtDesc(String status);
}