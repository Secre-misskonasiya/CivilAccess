package com.example.demo.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "document_requests")
public class DocumentRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "resident_id")
    private String residentId;

    @Column(name = "address")
    private String address;

    @Column(name = "purpose_of_request")
    private String purposeOfRequest;

    @Column(name = "residency_proof_url")
    private String residencyProofUrl;

    @Column(name = "valid_id_url")
    private String validIdUrl;

    @Column(name = "status")
    private String status; 

    @Column(name = "date_submitted")
    private OffsetDateTime dateSubmitted;

    @Column(name = "date_processed")
    private OffsetDateTime dateProcessed;

    @Column(name = "processed_by")
    private String processedBy;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "contact_number")
    private String contactNumber;

    @Column(name = "request_type")
    private String requestType;

    @Column(name = "document_type")
    private String documentType;

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public String getResidentId() { return residentId; }
    public void setResidentId(String residentId) { this.residentId = residentId; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getPurposeOfRequest() { return purposeOfRequest; }
    public void setPurposeOfRequest(String purposeOfRequest) { this.purposeOfRequest = purposeOfRequest; }

    public String getResidencyProofUrl() { return residencyProofUrl; }
    public void setResidencyProofUrl(String residencyProofUrl) { this.residencyProofUrl = residencyProofUrl; }

    public String getValidIdUrl() { return validIdUrl; }
    public void setValidIdUrl(String validIdUrl) { this.validIdUrl = validIdUrl; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getDateSubmitted() { return dateSubmitted; }
    public void setDateSubmitted(OffsetDateTime dateSubmitted) { this.dateSubmitted = dateSubmitted; }

    public OffsetDateTime getDateProcessed() { return dateProcessed; }
    public void setDateProcessed(OffsetDateTime dateProcessed) { this.dateProcessed = dateProcessed; }

    public String getProcessedBy() { return processedBy; }
    public void setProcessedBy(String processedBy) { this.processedBy = processedBy; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }

    public String getRequestType() { return requestType; }
    public void setRequestType(String requestType) { this.requestType = requestType; }

    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }
}
