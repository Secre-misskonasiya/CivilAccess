package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "rentals")
public class Rental {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String renterName;
    private String equipmentType;
    private Integer quantity = 1;
    private Long reservationId;
    private LocalDate rentalDate;
    private LocalDate expectedReturnDate;
    private LocalDate actualReturnDate;
    private LocalDate archivedDate;
    private Double totalPrice = 0.0;
    private String status = "INCOMING";
    private String processedBy;  // NEW FIELD - stores who processed the return/archive
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        rentalDate = LocalDate.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        // Auto-set overdue status if applicable
        if ("ACTIVE".equals(status) && expectedReturnDate != null && expectedReturnDate.isBefore(LocalDate.now())) {
            status = "OVERDUE";
        }
    }

    public void calculateTotalPrice() {
        double dailyRate = getDailyRate(equipmentType);
        this.totalPrice = dailyRate * quantity;
    }

    private double getDailyRate(String type) {
        if (type == null) return 0;
        switch (type) {
            case "Chair": return 15;
            case "Canopy Tent": return 250;
            case "Sound System": return 500;
            case "Table": return 100;
            case "Generator": return 800;
            default: return 0;
        }
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRenterName() { return renterName; }
    public void setRenterName(String renterName) { this.renterName = renterName; }

    public String getEquipmentType() { return equipmentType; }
    public void setEquipmentType(String equipmentType) { 
        this.equipmentType = equipmentType; 
        calculateTotalPrice();
    }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { 
        this.quantity = quantity; 
        calculateTotalPrice();
    }

    public Long getReservationId() { return reservationId; }
    public void setReservationId(Long reservationId) { this.reservationId = reservationId; }

    public LocalDate getRentalDate() { return rentalDate; }
    public void setRentalDate(LocalDate rentalDate) { this.rentalDate = rentalDate; }

    public LocalDate getExpectedReturnDate() { return expectedReturnDate; }
    public void setExpectedReturnDate(LocalDate expectedReturnDate) { 
        this.expectedReturnDate = expectedReturnDate;
        if ("ACTIVE".equals(status) && expectedReturnDate != null && expectedReturnDate.isBefore(LocalDate.now())) {
            this.status = "OVERDUE";
        }
    }

    public LocalDate getActualReturnDate() { return actualReturnDate; }
    public void setActualReturnDate(LocalDate actualReturnDate) { this.actualReturnDate = actualReturnDate; }

    public LocalDate getArchivedDate() { return archivedDate; }
    public void setArchivedDate(LocalDate archivedDate) { this.archivedDate = archivedDate; }

    public Double getTotalPrice() { return totalPrice; }
    public void setTotalPrice(Double totalPrice) { this.totalPrice = totalPrice; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    public String getProcessedBy() { return processedBy; }
    public void setProcessedBy(String processedBy) { this.processedBy = processedBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}