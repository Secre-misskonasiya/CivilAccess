package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "EmergencyAlerts")
public class EmergencyAlerts { 

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO) 
    private UUID id;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    private String location;
    private String type;
    private String priority;
    private String status; 

    private LocalDateTime dateCreated;
    private boolean archived;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", referencedColumnName = "id")
    private AdminUser createdBy;

    private String createdByName;
    private String createdByEmployeeId;
    private String createdByRole;
    
    // New fields for coordinates
    private Double latitude;
    private Double longitude;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public LocalDateTime getDateCreated() { return dateCreated; }
    public void setDateCreated(LocalDateTime dateCreated) { this.dateCreated = dateCreated; }

    public boolean isArchived() { return archived; }
    public void setArchived(boolean archived) { this.archived = archived; }

    public AdminUser getCreatedBy() { return createdBy; }
    public void setCreatedBy(AdminUser createdBy) { this.createdBy = createdBy; }

    public String getCreatedByName() { return createdByName; }
    public void setCreatedByName(String createdByName) { this.createdByName = createdByName; }

    public String getCreatedByEmployeeId() { return createdByEmployeeId; }
    public void setCreatedByEmployeeId(String createdByEmployeeId) { this.createdByEmployeeId = createdByEmployeeId; }

    public String getCreatedByRole() { return createdByRole; }
    public void setCreatedByRole(String createdByRole) { this.createdByRole = createdByRole; }
    
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public void assignCreator(AdminUser admin) {
        this.createdBy = admin;
        this.createdByName = admin.getName();
        this.createdByEmployeeId = admin.getEmployeeId();
        this.createdByRole = admin.getRole();
        this.dateCreated = LocalDateTime.now();
        this.archived = false;
    }
}