package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "program_budget")
public class ProgramBudget {

    // ========== ENUMS INSIDE ==========
    
    public enum BudgetStatus {
        ON_TRACK("On Track"),
        OVER_BUDGET("Over Budget"),
        UNDER_BUDGET("Under Budget");

        private final String displayName;

        BudgetStatus(String displayName) {
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

    @Column(name = "program_id", nullable = false)
    private Long programId;

    @Column(name = "budget_item", nullable = false)
    private String budgetItem;

    @Column(name = "amount", nullable = false)
    private Double amount;

    @Column(name = "actual_spent")
    private Double actualSpent = 0.0;

    @Column(name = "remaining_budget")
    private Double remainingBudget;

    @Enumerated(EnumType.STRING)
    @Column(name = "budget_status")
    private BudgetStatus budgetStatus = BudgetStatus.ON_TRACK;

    @Column(name = "fiscal_year")
    private Integer fiscalYear;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (actualSpent == null) actualSpent = 0.0;
        if (remainingBudget == null) remainingBudget = amount - actualSpent;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        this.remainingBudget = this.amount - this.actualSpent;
        
        if (this.actualSpent > this.amount) {
            this.budgetStatus = BudgetStatus.OVER_BUDGET;
        } else if (this.actualSpent < this.amount) {
            this.budgetStatus = BudgetStatus.UNDER_BUDGET;
        } else {
            this.budgetStatus = BudgetStatus.ON_TRACK;
        }
    }

    // ========== GETTERS & SETTERS ==========
    
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getProgramId() { return programId; }
    public void setProgramId(Long programId) { this.programId = programId; }

    public String getBudgetItem() { return budgetItem; }
    public void setBudgetItem(String budgetItem) { this.budgetItem = budgetItem; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public Double getActualSpent() { return actualSpent; }
    public void setActualSpent(Double actualSpent) { this.actualSpent = actualSpent; }

    public Double getRemainingBudget() { return remainingBudget; }
    public void setRemainingBudget(Double remainingBudget) { this.remainingBudget = remainingBudget; }

    public BudgetStatus getBudgetStatus() { return budgetStatus; }
    public void setBudgetStatus(BudgetStatus budgetStatus) { this.budgetStatus = budgetStatus; }

    public Integer getFiscalYear() { return fiscalYear; }
    public void setFiscalYear(Integer fiscalYear) { this.fiscalYear = fiscalYear; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}