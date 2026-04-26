package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "safety_reports")
public class SafetyReports{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String location;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String type;
    private String priority;

    private String reporterName;
    private String reporterContact;
    private LocalDate dateSubmitted;

    private String status;

    private String handledByName;
    private String handledByEmployeeId;
    private String handledByRole;
    private LocalDateTime dateHandled;

    @Column(columnDefinition = "TEXT")
    private String handlerRemarks;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "handled_by_id", referencedColumnName = "id")
    private AdminUser handledBy;

    // Who resolved the report
    private String resolvedBy;

    // Resolution details fields
    @Column(columnDefinition = "TEXT")
    private String resolutionActions;
    
    private String resolutionResponseTime;
    
    @Column(columnDefinition = "TEXT")
    private String resolutionNotes;

    private Double latitude;
    private Double longitude;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getReporterName() { return reporterName; }
    public void setReporterName(String reporterName) { this.reporterName = reporterName; }

    public String getReporterContact() { return reporterContact; }
    public void setReporterContact(String reporterContact) { this.reporterContact = reporterContact; }

    public LocalDate getDateSubmitted() { return dateSubmitted; }
    public void setDateSubmitted(LocalDate dateSubmitted) { this.dateSubmitted = dateSubmitted; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getHandledByName() { return handledByName; }
    public void setHandledByName(String handledByName) { this.handledByName = handledByName; }

    public String getHandledByEmployeeId() { return handledByEmployeeId; }
    public void setHandledByEmployeeId(String handledByEmployeeId) { this.handledByEmployeeId = handledByEmployeeId; }

    public String getHandledByRole() { return handledByRole; }
    public void setHandledByRole(String handledByRole) { this.handledByRole = handledByRole; }

    public LocalDateTime getDateHandled() { return dateHandled; }
    public void setDateHandled(LocalDateTime dateHandled) { this.dateHandled = dateHandled; }

    public String getHandlerRemarks() { return handlerRemarks; }
    public void setHandlerRemarks(String handlerRemarks) { this.handlerRemarks = handlerRemarks; }

    public AdminUser getHandledBy() { return handledBy; }
    public void setHandledBy(AdminUser handledBy) { this.handledBy = handledBy; }

    public String getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(String resolvedBy) { this.resolvedBy = resolvedBy; }

    public String getResolutionActions() { return resolutionActions; }
    public void setResolutionActions(String resolutionActions) { this.resolutionActions = resolutionActions; }

    public String getResolutionResponseTime() { return resolutionResponseTime; }
    public void setResolutionResponseTime(String resolutionResponseTime) { this.resolutionResponseTime = resolutionResponseTime; }

    public String getResolutionNotes() { return resolutionNotes; }
    public void setResolutionNotes(String resolutionNotes) { this.resolutionNotes = resolutionNotes; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    @Transient
    public void assignHandler(AdminUser admin) {
        this.handledBy = admin;
        this.handledByName = admin.getName();
        this.handledByEmployeeId = admin.getEmployeeId();
        this.handledByRole = admin.getRole();
        this.dateHandled = LocalDateTime.now();
        this.status = "APPROVED";
    }
}