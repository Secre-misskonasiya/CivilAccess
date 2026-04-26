package com.example.demo.model;

import jakarta.persistence.*;

@Entity
@Table(name = "program_budget")
public class ProgramBudget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long programId; 

    private String budgetItem;

    private Double amount;

    
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getProgramId() { return programId; }
    public void setProgramId(Long programId) { this.programId = programId; }

    public String getBudgetItem() { return budgetItem; }
    public void setBudgetItem(String budgetItem) { this.budgetItem = budgetItem; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }
}