package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "contact_help_requests")
public class ContactHelpRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name; 
    private String email;
    private String phoneNumber;
    private String type;

    @Column(columnDefinition = "TEXT")
    private String message;

    private String status; 
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
    
    // NEW FIELD - tracks when admin last viewed this conversation
    private LocalDateTime adminLastViewedAt;
    
    // NEW FIELD - who resolved the request
    private String resolvedBy;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }
    
    public LocalDateTime getAdminLastViewedAt() { return adminLastViewedAt; }
    public void setAdminLastViewedAt(LocalDateTime adminLastViewedAt) { this.adminLastViewedAt = adminLastViewedAt; }
    
    public String getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(String resolvedBy) { this.resolvedBy = resolvedBy; }
}