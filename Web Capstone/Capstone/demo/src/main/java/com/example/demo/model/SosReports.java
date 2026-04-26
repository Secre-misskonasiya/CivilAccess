package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sos_reports")
public class SosReports {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String reporterName;
    private String phoneNumber;
    private String sosType;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String location;
    private Double latitude;
    private Double longitude;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_facility_id")
    private Facilities assignedFacility;

    private String status;
    private LocalDateTime dateReported;
    private LocalDateTime dateResolved;
    
    // New field for responder name
    private String responderName;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getReporterName() { return reporterName; }
    public void setReporterName(String reporterName) { this.reporterName = reporterName; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getSosType() { return sosType; }
    public void setSosType(String sosType) { this.sosType = sosType; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Facilities getAssignedFacility() { return assignedFacility; }
    public void setAssignedFacility(Facilities assignedFacility) { this.assignedFacility = assignedFacility; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getDateReported() { return dateReported; }
    public void setDateReported(LocalDateTime dateReported) { this.dateReported = dateReported; }

    public LocalDateTime getDateResolved() { return dateResolved; }
    public void setDateResolved(LocalDateTime dateResolved) { this.dateResolved = dateResolved; }
    
    public String getResponderName() { return responderName; }
    public void setResponderName(String responderName) { this.responderName = responderName; }
}