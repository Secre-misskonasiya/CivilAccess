package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "requests")
public class Requests {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name; 
    private String phoneNumber;
    private String fileAttachment;
    private String requestType;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String location;
    private String status; 
    
    private LocalDateTime dateSubmitted;
    private LocalDateTime dateProcessed;
    
    private Long processedBy;

 
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getFileAttachment() { return fileAttachment; }
    public void setFileAttachment(String fileAttachment) { this.fileAttachment = fileAttachment; }

    public String getRequestType() { return requestType; }
    public void setRequestType(String requestType) { this.requestType = requestType; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getDateSubmitted() { return dateSubmitted; }
    public void setDateSubmitted(LocalDateTime dateSubmitted) { this.dateSubmitted = dateSubmitted; }

    public LocalDateTime getDateProcessed() { return dateProcessed; }
    public void setDateProcessed(LocalDateTime dateProcessed) { this.dateProcessed = dateProcessed; }

    public Long getProcessedBy() { return processedBy; }
    public void setProcessedBy(Long processedBy) { this.processedBy = processedBy; }
}