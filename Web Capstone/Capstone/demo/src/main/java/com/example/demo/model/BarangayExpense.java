package com.example.demo.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "barangay_expenses")
public class BarangayExpense {

    // ========== ENUMS INSIDE ==========
    
    public enum ExpenseType {
        PROGRAM("Program Expense"),
        SUPPLIES("Office Supplies"),
        UTILITIES("Utilities"),
        SALARY("Salary / Honorarium"),
        EMERGENCY("Emergency Response"),
        INFRASTRUCTURE("Infrastructure"),
        EVENTS("Events / Fiestas"),
        OTHER("Other");

        private final String displayName;

        ExpenseType(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    public enum FundSource {
        GENERAL_FUND("General Fund"),
        SK_FUND("SK Fund"),
        DISASTER_FUND("Disaster Fund"),
        SPECIAL_FUND("Special Fund");

        private final String displayName;

        FundSource(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    public enum ExpenseStatus {
        PENDING("Pending Approval"),
        APPROVED("Approved");

        private final String displayName;

        ExpenseStatus(String displayName) {
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

    @NotNull(message = "Expense date is required")
    @PastOrPresent(message = "Expense date cannot be in the future")
    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    @NotNull(message = "Expense type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "expense_type", nullable = false)
    private ExpenseType expenseType;

    @NotBlank(message = "Description is required")
    @Size(max = 500, message = "Description cannot exceed 500 characters")
    @Column(name = "description", nullable = false, length = 500)
    private String description;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be greater than 0")
    @DecimalMin(value = "0.01", message = "Amount must be at least 0.01")
    @Column(name = "amount", nullable = false)
    private Double amount;

    @NotNull(message = "Fund source is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "fund_source", nullable = false)
    private FundSource fundSource;

    @Column(name = "payee")
    private String payee;

    @Column(name = "receipt_number")
    private String receiptNumber;

    @Column(name = "receipt_file_url")
    private String receiptFileUrl;

    @NotNull(message = "Status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ExpenseStatus status = ExpenseStatus.PENDING;

    @Column(name = "program_id")
    private Long programId;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "created_by")
    private Long createdBy;

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
        if (expenseDate == null) {
            expenseDate = LocalDate.now();
        } else {
            // Validate and fix bad date
            expenseDate = validateDate(expenseDate);
        }
        if (status == null) {
            status = ExpenseStatus.PENDING;
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

    public LocalDate getExpenseDate() { return expenseDate; }
    
    public void setExpenseDate(LocalDate expenseDate) {
        if (expenseDate != null && (expenseDate.getYear() < 1900 || expenseDate.getYear() > 2100)) {
            this.expenseDate = LocalDate.now();
        } else {
            this.expenseDate = expenseDate;
        }
    }

    public ExpenseType getExpenseType() { return expenseType; }
    public void setExpenseType(ExpenseType expenseType) { this.expenseType = expenseType; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) {
        if (amount != null && amount <= 0) {
            throw new IllegalArgumentException("Amount must be greater than 0");
        }
        this.amount = amount;
    }

    public FundSource getFundSource() { return fundSource; }
    public void setFundSource(FundSource fundSource) { this.fundSource = fundSource; }

    public String getPayee() { return payee; }
    public void setPayee(String payee) { this.payee = payee; }

    public String getReceiptNumber() { return receiptNumber; }
    public void setReceiptNumber(String receiptNumber) { this.receiptNumber = receiptNumber; }

    public String getReceiptFileUrl() { return receiptFileUrl; }
    public void setReceiptFileUrl(String receiptFileUrl) { this.receiptFileUrl = receiptFileUrl; }

    public ExpenseStatus getStatus() { return status; }
    public void setStatus(ExpenseStatus status) { this.status = status; }

    public Long getProgramId() { return programId; }
    public void setProgramId(Long programId) { this.programId = programId; }

    public Long getApprovedBy() { return approvedBy; }
    public void setApprovedBy(Long approvedBy) { this.approvedBy = approvedBy; }

    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Boolean getArchived() { return archived; }
    public void setArchived(Boolean archived) { this.archived = archived != null ? archived : false; }

    public LocalDateTime getArchivedAt() { return archivedAt; }
    public void setArchivedAt(LocalDateTime archivedAt) { this.archivedAt = archivedAt; }

    public Long getArchivedBy() { return archivedBy; }
    public void setArchivedBy(Long archivedBy) { this.archivedBy = archivedBy; }
}