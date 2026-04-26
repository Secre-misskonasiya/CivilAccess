package com.example.demo.repository;


import com.example.demo.model.DocumentRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRequestRepository extends JpaRepository<DocumentRequest, Long> {

    List<DocumentRequest> findByStatus(String status);

    List<DocumentRequest> findByFullNameContainingIgnoreCaseOrDocumentTypeContainingIgnoreCase(
        String fullName, String documentType
    );
    long countByStatusNotIn(List<String> statuses);
}