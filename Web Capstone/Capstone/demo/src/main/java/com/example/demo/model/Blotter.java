package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "blotter_records")
public class Blotter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "complainant_name")
    private String complainantName;
    
    @Column(name = "contact_info")
    private String contactInfo;          // KEPT from first file
    
    @Column(name = "respondent_name")
    private String respondentName;
    
    @Column(name = "incident_type")
    private String incidentType;
    
    @Column(name = "incident_date")
    private LocalDateTime incidentDate;   // Changed from LocalDate to LocalDateTime
    
    @Column(name = "incident_location")
    private String incidentLocation;
    
    @Column(columnDefinition = "TEXT")
    private String narrative;
    
    @Column(columnDefinition = "TEXT")
    private String remarks;               // KEPT from first file
    
    private String status;  // INCOMING, PROCESSING, READY, ARCHIVE
    
    @Column(name = "created_by")
    private String createdBy;
    
    @Column(name = "updated_by")
    private String updatedBy;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Constructors
    public Blotter() {}
    
    public Blotter(String complainantName, String respondentName, String incidentType, 
                   LocalDateTime incidentDate, String incidentLocation, String narrative) {
        this.complainantName = complainantName;
        this.respondentName = respondentName;
        this.incidentType = incidentType;
        this.incidentDate = incidentDate;
        this.incidentLocation = incidentLocation;
        this.narrative = narrative;
        this.status = "INCOMING";
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getComplainantName() { return complainantName; }
    public void setComplainantName(String complainantName) { this.complainantName = complainantName; }
    
    public String getContactInfo() { return contactInfo; }               // ADDED
    public void setContactInfo(String contactInfo) { this.contactInfo = contactInfo; }  // ADDED
    
    public String getRespondentName() { return respondentName; }
    public void setRespondentName(String respondentName) { this.respondentName = respondentName; }
    
    public String getIncidentType() { return incidentType; }
    public void setIncidentType(String incidentType) { this.incidentType = incidentType; }
    
    public LocalDateTime getIncidentDate() { return incidentDate; }
    public void setIncidentDate(LocalDateTime incidentDate) { this.incidentDate = incidentDate; }
    
    public String getIncidentLocation() { return incidentLocation; }
    public void setIncidentLocation(String incidentLocation) { this.incidentLocation = incidentLocation; }
    
    public String getNarrative() { return narrative; }
    public void setNarrative(String narrative) { this.narrative = narrative; }
    
    public String getRemarks() { return remarks; }                       // ADDED
    public void setRemarks(String remarks) { this.remarks = remarks; }   // ADDED
    
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}