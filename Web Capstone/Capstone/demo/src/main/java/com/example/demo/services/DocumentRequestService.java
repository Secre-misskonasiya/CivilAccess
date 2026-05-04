package com.example.demo.services;

import com.example.demo.model.DocumentRequest;
import com.example.demo.repository.DocumentRequestRepository;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class DocumentRequestService {

    private final DocumentRequestRepository repository;

    public DocumentRequestService(DocumentRequestRepository repository) {
        this.repository = repository;
    }

    public List<DocumentRequest> getByStatus(String status) {
        return repository.findByStatus(status);
    }

    public List<DocumentRequest> searchRequests(String query) {
        return repository.findByFullNameContainingIgnoreCaseOrDocumentTypeContainingIgnoreCase(query, query);
    }

    public DocumentRequest updateStatus(Long id, String newStatus, String processedBy) {
        DocumentRequest request = repository.findById(id)
            .orElseThrow(() -> new RuntimeException("Request not found: " + id));

        request.setStatus(newStatus);

        if (processedBy != null && !processedBy.isBlank()) {
            request.setProcessedBy(processedBy);
            request.setDateProcessed(OffsetDateTime.now());
        }

        return repository.save(request);
    }

    public DocumentRequest updateReadiedDocument(Long id, String readiedDocumentUrl, String processedBy) {
        DocumentRequest request = repository.findById(id)
            .orElseThrow(() -> new RuntimeException("Request not found: " + id));
        
        request.setReadiedDocumentUrl(readiedDocumentUrl);
        request.setStatus("READY");
        
        if (processedBy != null && !processedBy.isBlank()) {
            request.setProcessedBy(processedBy);
            request.setDateProcessed(OffsetDateTime.now());
        }
        
        return repository.save(request);
    }

    public void archiveRequest(Long id, String processedBy) {
        updateStatus(id, "RESOLVED", processedBy);
    }
    
    public long countPending() {
        return repository.countByStatusNotIn(List.of("RESOLVED", "ARCHIVED"));
    }
    
    public DocumentRequest getById(Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new RuntimeException("Request not found: " + id));
    }

    public DocumentRequestRepository getRepository() {
        return repository;
    }
}