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

    @Column(name = "2x2_url")
    private String photo2x2Url;

    @Column(name = "readied_document")
    private String readiedDocumentUrl;

    @Column(name = "birthdate")
    private String birthdate;

    @Column(name = "emergency_name")
    private String emergencyName;

    @Column(name = "emergency_address")
    private String emergencyAddress;

    @Column(name = "emergency_contact")
    private String emergencyContact;

    // ── New fields for document processing ──────────────────────────────────

    @Column(name = "doc_age")
    private String docAge;

    @Column(name = "doc_civil_status")
    private String docCivilStatus;

    @Column(name = "doc_gender")
    private String docGender;

    @Column(name = "doc_issued_day")
    private String docIssuedDay;

    @Column(name = "doc_issued_month_year")
    private String docIssuedMonthYear;

    @Column(name = "doc_captain_name")
    private String docCaptainName;

    @Column(name = "doc_or_number")
    private String docOrNumber;

    @Column(name = "doc_date_issued")
    private String docDateIssued;

    @Column(name = "doc_purpose")
    private String docPurpose;

    @Column(name = "doc_nb_note")
    private String docNbNote;

    // ADDED: Middle name field
    @Column(name = "middle_name")
    private String middleName;

    // ===== CONSTRUCTORS =====

    public DocumentRequest() {}

    public DocumentRequest(String fullName, String contactNumber, String documentType, 
                           String purposeOfRequest, String address, String validIdUrl, 
                           String photo2x2Url) {
        this.fullName = fullName;
        this.contactNumber = contactNumber;
        this.documentType = documentType;
        this.purposeOfRequest = purposeOfRequest;
        this.address = address;
        this.validIdUrl = validIdUrl;
        this.photo2x2Url = photo2x2Url;
        this.status = "INCOMING";
        this.createdAt = OffsetDateTime.now();
        this.dateSubmitted = OffsetDateTime.now();
    }

    // ===== GETTERS AND SETTERS =====

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

    public String getPhoto2x2Url() { return photo2x2Url; }
    public void setPhoto2x2Url(String photo2x2Url) { this.photo2x2Url = photo2x2Url; }

    public String getReadiedDocumentUrl() { return readiedDocumentUrl; }
    public void setReadiedDocumentUrl(String readiedDocumentUrl) { this.readiedDocumentUrl = readiedDocumentUrl; }

    public String getBirthdate() { return birthdate; }
    public void setBirthdate(String birthdate) { this.birthdate = birthdate; }

    public String getEmergencyName() { return emergencyName; }
    public void setEmergencyName(String emergencyName) { this.emergencyName = emergencyName; }

    public String getEmergencyAddress() { return emergencyAddress; }
    public void setEmergencyAddress(String emergencyAddress) { this.emergencyAddress = emergencyAddress; }

    public String getEmergencyContact() { return emergencyContact; }
    public void setEmergencyContact(String emergencyContact) { this.emergencyContact = emergencyContact; }

    public String getDocAge() { return docAge; }
    public void setDocAge(String docAge) { this.docAge = docAge; }

    public String getDocCivilStatus() { return docCivilStatus; }
    public void setDocCivilStatus(String docCivilStatus) { this.docCivilStatus = docCivilStatus; }

    public String getDocGender() { return docGender; }
    public void setDocGender(String docGender) { this.docGender = docGender; }

    public String getDocIssuedDay() { return docIssuedDay; }
    public void setDocIssuedDay(String docIssuedDay) { this.docIssuedDay = docIssuedDay; }

    public String getDocIssuedMonthYear() { return docIssuedMonthYear; }
    public void setDocIssuedMonthYear(String docIssuedMonthYear) { this.docIssuedMonthYear = docIssuedMonthYear; }

    public String getDocCaptainName() { return docCaptainName; }
    public void setDocCaptainName(String docCaptainName) { this.docCaptainName = docCaptainName; }

    public String getDocOrNumber() { return docOrNumber; }
    public void setDocOrNumber(String docOrNumber) { this.docOrNumber = docOrNumber; }

    public String getDocDateIssued() { return docDateIssued; }
    public void setDocDateIssued(String docDateIssued) { this.docDateIssued = docDateIssued; }

    public String getDocPurpose() { return docPurpose; }
    public void setDocPurpose(String docPurpose) { this.docPurpose = docPurpose; }

    public String getDocNbNote() { return docNbNote; }
    public void setDocNbNote(String docNbNote) { this.docNbNote = docNbNote; }

    public String getMiddleName() { return middleName; }
    public void setMiddleName(String middleName) { this.middleName = middleName; }
}