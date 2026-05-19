package com.example.demo.services;

import com.example.demo.model.BarangayIncome;
import com.example.demo.model.BarangayIncome.IncomeType;
import com.example.demo.model.BarangayIncome.DocumentType;
import com.example.demo.model.DocumentRequest;
import com.example.demo.repository.DocumentRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Service
public class DocumentRequestService {

    private final DocumentRequestRepository repository;

    @Autowired
    private BarangayIncomeService barangayIncomeService;

    public DocumentRequestService(DocumentRequestRepository repository) {
        this.repository = repository;
    }

    // ── Auto-income helper ────────────────────────────────────────────────────
    /**
     * Called whenever a document request is marked READY.
     * Records a ₱30 DOCUMENT_FEE income entry linked to the requester and document type.
     */
    private void recordDocumentFeeIncome(DocumentRequest doc) {
        try {
            BarangayIncome income = new BarangayIncome();
            income.setIncomeDate(LocalDate.now());
            income.setIncomeType(IncomeType.DOCUMENT_FEE);
            income.setAmount(30.0);

            // sourceName = requester's name so it appears clearly in the income list
            String sourceName = (doc.getFullName() != null && !doc.getFullName().isBlank())
                ? doc.getFullName()
                : "Unknown Requester";
            income.setSourceName(sourceName);

            // Map the document request's type string to the DocumentType enum.
            // Falls back to DocumentType.OTHER if the value doesn't match any known type.
            String docTypeStr = (doc.getDocumentType() != null && !doc.getDocumentType().isBlank())
                ? doc.getDocumentType().trim().toUpperCase().replace(" ", "_")
                : "";
            DocumentType documentType;
            try {
                documentType = DocumentType.valueOf(docTypeStr);
            } catch (IllegalArgumentException ex) {
                documentType = DocumentType.OTHER;
            }
            income.setDocumentType(documentType);

            barangayIncomeService.createIncome(income);
        } catch (Exception e) {
            // Log but don't break the status update if income recording fails
            System.err.println("[DocumentRequestService] Failed to record document fee income: " + e.getMessage());
        }
    }

    public List<DocumentRequest> getByStatus(String status) {
        return repository.findByStatusOrderByIdDesc(status);
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

        DocumentRequest saved = repository.save(request);

        // Auto-record ₱30 document fee income when a request is marked READY
        if ("READY".equalsIgnoreCase(newStatus)) {
            recordDocumentFeeIncome(saved);
        }

        return saved;
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
        
        DocumentRequest saved = repository.save(request);

        // Auto-record ₱30 document fee income when document is uploaded and marked READY
        recordDocumentFeeIncome(saved);

        return saved;
    }

    public void archiveRequest(Long id, String processedBy) {
        updateStatus(id, "RESOLVED", processedBy);
    }
    
    public long countPending() {
        return repository.countByStatusNotIn(List.of("RESOLVED", "ARCHIVED"));
    }

        
    public long countThisMonth() {
        return repository.countThisMonth();
    }
    
    public DocumentRequest getById(Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new RuntimeException("Request not found: " + id));
    }

    public DocumentRequestRepository getRepository() {
        return repository;
    }
}