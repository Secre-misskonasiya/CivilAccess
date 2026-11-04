package com.example.demo.services;

import com.example.demo.model.ProgramBudget;
import com.example.demo.model.ProgramBudget.BudgetStatus;
import com.example.demo.repository.ProgramBudgetRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ProgramBudgetService {

    @Autowired
    private ProgramBudgetRepository repository;

    @Autowired
    private ObjectMapper objectMapper;

    // ========== EXISTING METHODS (KEPT) ==========

    public ProgramBudget saveBudgetItem(String jsonPart, Long programId) throws Exception {
        ProgramBudget budget = objectMapper.readValue(jsonPart, ProgramBudget.class);
        budget.setProgramId(programId);
        if (budget.getFiscalYear() == null) {
            budget.setFiscalYear(LocalDate.now().getYear());
        }
        return repository.save(budget);
    }

    public ProgramBudget saveManualEntry(ProgramBudget budget) {
        if (budget.getBudgetItem() == null || budget.getBudgetItem().isEmpty()) {
            budget.setBudgetItem("Manual Budget Update");
        }
        if (budget.getFiscalYear() == null) {
            budget.setFiscalYear(LocalDate.now().getYear());
        }
        return repository.save(budget);
    }

    public ProgramBudget updateFirstEntry(Double newAmount) {
        List<ProgramBudget> all = repository.findAll();
        if (all.isEmpty()) {
            ProgramBudget entry = new ProgramBudget();
            entry.setBudgetItem("Manual Budget Update");
            entry.setAmount(newAmount);
            entry.setProgramId(1L);
            entry.setFiscalYear(LocalDate.now().getYear());
            return repository.save(entry);
        }
        ProgramBudget first = all.get(0);
        first.setAmount(newAmount);
        return repository.save(first);
    }

    public Double getTotalBudget() {
        return repository.getTotalBudget();
    }

    public Double getTotalRemainingBudget() {
        return repository.getTotalRemainingBudget();
    }

    public List<ProgramBudget> getAllBudgets() {
        return repository.findAll();
    }

    public List<ProgramBudget> getBudgetsByProgram(Long programId) {
        return repository.findByProgramId(programId);
    }

    public void deleteBudget(Long id) {
        repository.deleteById(id);
    }

    public ProgramBudget getBudgetItemById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Budget item not found with id: " + id));
    }

    @Transactional
    public ProgramBudget updateBudgetItem(Long id, ProgramBudget updatedItem) {
        ProgramBudget existing = getBudgetItemById(id);
        existing.setBudgetItem(updatedItem.getBudgetItem());
        existing.setAmount(updatedItem.getAmount());
        if (updatedItem.getFiscalYear() != null) {
            existing.setFiscalYear(updatedItem.getFiscalYear());
        }
        existing.setRemainingBudget(existing.getAmount() - existing.getActualSpent());
        refreshStatus(existing);
        return repository.save(existing);
    }

    public List<ProgramBudget> getCurrentYearBudget() {
        return repository.findByFiscalYear(LocalDate.now().getYear());
    }

    public Map<String, Object> getCompleteBudgetSummary() {
        Map<String, Object> summary = new HashMap<>();
        summary.put("totalAllocated", repository.getTotalBudget());
        summary.put("totalActualSpent", repository.getTotalActualSpent());
        summary.put("totalRemaining", repository.getTotalRemainingBudget());
        return summary;
    }

    // ========== INCOME ↔ BUDGET INTEGRATION ==========

    /**
     * Called when a new income record is saved.
     * Increases the TOTAL_BUDGET amount so the available fund pool grows.
     * If no TOTAL_BUDGET record exists yet, one is created automatically.
     */
    @Transactional
    public void applyIncomeToBudget(Double incomeAmount) {
        if (incomeAmount == null || incomeAmount <= 0) return;

        ProgramBudget record = repository.findTotalBudgetRecord().orElse(null);

        if (record == null) {
            record = new ProgramBudget();
            record.setProgramId(0L);
            record.setBudgetItem("TOTAL_BUDGET");
            record.setAmount(0.0);
            record.setActualSpent(0.0);
            record.setFiscalYear(LocalDate.now().getYear());
        }

        record.setAmount(record.getAmount() + incomeAmount);
        record.setRemainingBudget(record.getAmount() - record.getActualSpent());
        refreshStatus(record);
        repository.save(record);
    }

    /**
     * Called when an income record is deleted.
     * Reverses the addition from the TOTAL_BUDGET amount.
     */
    @Transactional
    public void reverseIncomeFromBudget(Double incomeAmount) {
        if (incomeAmount == null || incomeAmount <= 0) return;

        repository.findTotalBudgetRecord().ifPresent(record -> {
            double newAmount = Math.max(0, record.getAmount() - incomeAmount);
            record.setAmount(newAmount);
            record.setRemainingBudget(newAmount - record.getActualSpent());
            refreshStatus(record);
            repository.save(record);
        });
    }

    // ========== EXPENSE ↔ BUDGET INTEGRATION ==========

    /**
     * Called when an expense is APPROVED.
     * Increases actualSpent on the TOTAL_BUDGET record, reducing remainingBudget.
     */
    @Transactional
    public void applyExpenseToBudget(Long programId, Double expenseAmount) {
        if (expenseAmount == null || expenseAmount <= 0) return;

        repository.findTotalBudgetRecord().ifPresent(record -> {
            double newSpent = record.getActualSpent() + expenseAmount;
            record.setActualSpent(newSpent);
            record.setRemainingBudget(record.getAmount() - newSpent);
            refreshStatus(record);
            repository.save(record);
        });
    }

    /**
     * Called when an approved expense is deleted or rejected back to PENDING.
     * Reverses the actualSpent deduction on the TOTAL_BUDGET record.
     */
    @Transactional
    public void reverseExpenseFromBudget(Long programId, Double expenseAmount) {
        if (expenseAmount == null || expenseAmount <= 0) return;

        repository.findTotalBudgetRecord().ifPresent(record -> {
            double newSpent = Math.max(0, record.getActualSpent() - expenseAmount);
            record.setActualSpent(newSpent);
            record.setRemainingBudget(record.getAmount() - newSpent);
            refreshStatus(record);
            repository.save(record);
        });
    }

    // ---- private helper ----
    private void refreshStatus(ProgramBudget item) {
        if (item.getActualSpent() > item.getAmount()) {
            item.setBudgetStatus(BudgetStatus.OVER_BUDGET);
        } else if (item.getActualSpent() < item.getAmount()) {
            item.setBudgetStatus(BudgetStatus.UNDER_BUDGET);
        } else {
            item.setBudgetStatus(BudgetStatus.ON_TRACK);
        }
    }
}