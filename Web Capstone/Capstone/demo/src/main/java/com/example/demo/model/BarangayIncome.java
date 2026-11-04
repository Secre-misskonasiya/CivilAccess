package com.example.demo.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "barangay_income")
public class BarangayIncome {

    // ========== ENUMS INSIDE ==========
    
    public enum IncomeType {
        DOCUMENT_FEE("Document Fee"),
        RENTAL("Rental"),
        DONATION("Donation"),
        OTHER("Other");

        private final String displayName;

        IncomeType(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    public enum DocumentType {
        CLEARANCE("Barangay Clearance"),
        INDIGENCY("Certificate of Indigency"),
        BARANGAY_ID("Barangay ID"),
        CERTIFICATE("Certificate of Residency"),
        OTHER("Other");

        private final String displayName;

        DocumentType(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    // ========== FIELDS ==========
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Income date is required")
    @PastOrPresent(message = "Income date cannot be in the future")
    @Column(name = "income_date", nullable = false)
    private LocalDate incomeDate;

    @NotNull(message = "Income type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "income_type", nullable = false)
    private IncomeType incomeType;

    @NotBlank(message = "Source name is required")
    @Column(name = "source_name", nullable = false)
    private String sourceName;

    @Column(name = "resident_id")
    private Long residentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type")
    private DocumentType documentType;

    @Column(name = "rental_item")
    private String rentalItem;

    @Min(value = 1, message = "Rental hours must be at least 1")
    @Column(name = "rental_hours")
    private Integer rentalHours;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be greater than 0")
    @DecimalMin(value = "0.01", message = "Amount must be at least 0.01")
    @Column(name = "amount", nullable = false)
    private Double amount;

    @Column(name = "or_number", nullable = false, unique = true)
    private String orNumber;

    @Column(name = "collected_by")
    private Long collectedBy;

    @Size(max = 500, message = "Remarks cannot exceed 500 characters")
    @Column(name = "remarks", length = 500)
    private String remarks;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "archived", nullable = false)
    private Boolean archived = false;

    @Column(name = "archived_at")
    private LocalDateTime archivedAt;

    @Column(name = "archived_by")
    private Long archivedBy;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (incomeDate == null) {
            incomeDate = LocalDate.now();
        } else {
            // Validate and fix bad date
            incomeDate = validateDate(incomeDate);
        }
    }
    
    /**
     * Validates and fixes dates that are out of reasonable range
     */
    private LocalDate validateDate(LocalDate date) {
        if (date == null) return LocalDate.now();
        // Check if year is within reasonable range (1900-2100)
        if (date.getYear() < 1900 || date.getYear() > 2100) {
            System.err.println("WARNING: Invalid date detected: " + date + " - Replacing with current date");
            return LocalDate.now();
        }
        return date;
    }

    // ========== GETTERS & SETTERS with validation ==========
    
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDate getIncomeDate() { return incomeDate; }
    
    public void setIncomeDate(LocalDate incomeDate) {
        if (incomeDate != null && (incomeDate.getYear() < 1900 || incomeDate.getYear() > 2100)) {
            this.incomeDate = LocalDate.now();
        } else {
            this.incomeDate = incomeDate;
        }
    }

    public IncomeType getIncomeType() { return incomeType; }
    public void setIncomeType(IncomeType incomeType) { this.incomeType = incomeType; }

    public String getSourceName() { return sourceName; }
    public void setSourceName(String sourceName) { this.sourceName = sourceName; }

    public Long getResidentId() { return residentId; }
    public void setResidentId(Long residentId) { this.residentId = residentId; }

    public DocumentType getDocumentType() { return documentType; }
    public void setDocumentType(DocumentType documentType) { this.documentType = documentType; }

    public String getRentalItem() { return rentalItem; }
    public void setRentalItem(String rentalItem) { this.rentalItem = rentalItem; }

    public Integer getRentalHours() { return rentalHours; }
    public void setRentalHours(Integer rentalHours) { this.rentalHours = rentalHours; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { 
        if (amount != null && amount <= 0) {
            throw new IllegalArgumentException("Amount must be greater than 0");
        }
        this.amount = amount; 
    }

    public String getOrNumber() { return orNumber; }
    public void setOrNumber(String orNumber) { this.orNumber = orNumber; }

    public Long getCollectedBy() { return collectedBy; }
    public void setCollectedBy(Long collectedBy) { this.collectedBy = collectedBy; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Boolean getArchived() { return archived; }
    public void setArchived(Boolean archived) { this.archived = archived != null ? archived : false; }

    public LocalDateTime getArchivedAt() { return archivedAt; }
    public void setArchivedAt(LocalDateTime archivedAt) { this.archivedAt = archivedAt; }

    public Long getArchivedBy() { return archivedBy; }
    public void setArchivedBy(Long archivedBy) { this.archivedBy = archivedBy; }
}