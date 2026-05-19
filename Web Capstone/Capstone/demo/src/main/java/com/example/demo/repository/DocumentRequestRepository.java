package com.example.demo.repository;

import com.example.demo.model.DocumentRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRequestRepository extends JpaRepository<DocumentRequest, Long> {

    List<DocumentRequest> findByStatus(String status);

    List<DocumentRequest> findByResidentIdOrderByDateSubmittedDesc(String residentId);

    List<DocumentRequest> findByResidentId(String residentId);
    
    List<DocumentRequest> findByStatusOrderByIdDesc(String status);

    List<DocumentRequest> findByFullNameContainingIgnoreCaseOrDocumentTypeContainingIgnoreCase(
        String fullName, String documentType
    );
    @Query("""
        SELECT COUNT(d) FROM DocumentRequest d
        WHERE MONTH(d.dateSubmitted) = MONTH(CURRENT_DATE)
        AND YEAR(d.dateSubmitted) = YEAR(CURRENT_DATE)
        """)
    long countThisMonth();

    

    long countByStatusNotIn(List<String> statuses);
}