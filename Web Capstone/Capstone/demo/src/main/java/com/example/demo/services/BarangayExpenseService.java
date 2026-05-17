package com.example.demo.services;

import com.example.demo.model.BarangayExpense;
import com.example.demo.model.BarangayExpense.ExpenseType;
import com.example.demo.model.BarangayExpense.FundSource;
import com.example.demo.model.BarangayExpense.ExpenseStatus;
import com.example.demo.repository.BarangayExpenseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BarangayExpenseService {

    @Autowired
    private BarangayExpenseRepository barangayExpenseRepository;

    @Autowired
    private ProgramBudgetService programBudgetService;

    // Create new expense record — starts as PENDING, no budget impact yet.
    @Transactional
    public BarangayExpense createExpense(BarangayExpense expense) {
        if (expense.getStatus() == null) {
            expense.setStatus(ExpenseStatus.PENDING);
        }
        // Ensure programId defaults to 0L (TOTAL_BUDGET) if not set
        if (expense.getProgramId() == null) {
            expense.setProgramId(0L);
        }
        return barangayExpenseRepository.save(expense);
    }

    // Get all expenses
    public List<BarangayExpense> getAllExpenses() {
        return barangayExpenseRepository.findAll();
    }

    // Get expense by ID
    public BarangayExpense getExpenseById(Long id) {
        return barangayExpenseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Expense record not found with id: " + id));
    }

    /**
     * Update an expense record.
     * If the expense is already APPROVED and the amount changed,
     * the budget is rebalanced (reverse old, apply new).
     */
    @Transactional
    public BarangayExpense updateExpense(Long id, BarangayExpense expenseDetails) {
        BarangayExpense existing = getExpenseById(id);
        Double oldAmount = existing.getAmount();
        Long oldProgramId = existing.getProgramId() != null ? existing.getProgramId() : 0L;
        ExpenseStatus oldStatus = existing.getStatus();

        existing.setExpenseDate(expenseDetails.getExpenseDate());
        existing.setExpenseType(expenseDetails.getExpenseType());
        existing.setDescription(expenseDetails.getDescription());
        existing.setAmount(expenseDetails.getAmount());
        existing.setFundSource(expenseDetails.getFundSource());
        existing.setPayee(expenseDetails.getPayee());
        existing.setReceiptNumber(expenseDetails.getReceiptNumber());
        existing.setReceiptFileUrl(expenseDetails.getReceiptFileUrl());
        // Preserve programId — default to 0L if not provided
        Long newProgramId = expenseDetails.getProgramId() != null ? expenseDetails.getProgramId() : 0L;
        existing.setProgramId(newProgramId);

        BarangayExpense saved = barangayExpenseRepository.save(existing);

        // Budget rebalance only if expense already reduced the budget (was APPROVED)
        if (ExpenseStatus.APPROVED.equals(oldStatus) && !oldAmount.equals(saved.getAmount())) {
            programBudgetService.reverseExpenseFromBudget(oldProgramId, oldAmount);
            programBudgetService.applyExpenseToBudget(
                saved.getProgramId() != null ? saved.getProgramId() : 0L,
                saved.getAmount()
            );
        }

        return saved;
    }

    /**
     * Delete an expense record.
     * If the expense was APPROVED, its amount is reversed from the budget.
     * PENDING deletions have no budget impact.
     */
    @Transactional
    public void deleteExpense(Long id) {
        BarangayExpense expense = getExpenseById(id);
        barangayExpenseRepository.deleteById(id);

        // Reverse budget only if the expense had already been approved
        if (ExpenseStatus.APPROVED.equals(expense.getStatus())) {
            Long programId = expense.getProgramId() != null ? expense.getProgramId() : 0L;
            programBudgetService.reverseExpenseFromBudget(programId, expense.getAmount());
        }
    }

    /**
     * Approve an expense (PENDING → APPROVED).
     *
     * FIX: Guard against double-approval and handle null programId by
     * falling back to 0L (TOTAL_BUDGET record) so the deduction always lands.
     *
     * Root cause of the original bug: expenses submitted from the UI form
     * had no programId field, leaving it null. applyExpenseToBudget() then
     * could not find the correct budget record and silently skipped the deduction.
     */
    @Transactional
    public BarangayExpense approveExpense(Long id, Long approvedBy) {
        BarangayExpense expense = getExpenseById(id);

        // Guard: only approve if currently PENDING — prevents double-deduction
        if (!ExpenseStatus.PENDING.equals(expense.getStatus())) {
            throw new RuntimeException("Expense #" + id + " is already " + expense.getStatus() + " and cannot be approved again.");
        }

        expense.setStatus(ExpenseStatus.APPROVED);
        expense.setApprovedBy(approvedBy);

        // FIX: default null programId to 0L so it targets the TOTAL_BUDGET record
        if (expense.getProgramId() == null) {
            expense.setProgramId(0L);
        }

        BarangayExpense saved = barangayExpenseRepository.save(expense);

        // Budget integration: deduct from program budget + TOTAL_BUDGET
        programBudgetService.applyExpenseToBudget(saved.getProgramId(), saved.getAmount());

        return saved;
    }

    /**
     * Reject an expense back to PENDING.
     * If it was already APPROVED, reverses the budget deduction.
     */
    @Transactional
    public BarangayExpense rejectExpense(Long id, String rejectionReason) {
        BarangayExpense expense = getExpenseById(id);

        if (ExpenseStatus.APPROVED.equals(expense.getStatus())) {
            Long programId = expense.getProgramId() != null ? expense.getProgramId() : 0L;
            programBudgetService.reverseExpenseFromBudget(programId, expense.getAmount());
        }

        expense.setStatus(ExpenseStatus.PENDING);
        return barangayExpenseRepository.save(expense);
    }

    // Get expenses by date range
    public List<BarangayExpense> getExpensesByDateRange(LocalDate startDate, LocalDate endDate) {
        return barangayExpenseRepository.findByExpenseDateBetween(startDate, endDate);
    }

    // Get expenses by status
    public List<BarangayExpense> getExpensesByStatus(ExpenseStatus status) {
        return barangayExpenseRepository.findByStatus(status);
    }

    // Get pending expenses for approval
    public List<BarangayExpense> getPendingExpenses() {
        return barangayExpenseRepository.findByStatusOrderByExpenseDateDesc(ExpenseStatus.PENDING);
    }

    // Get approved expenses
    public List<BarangayExpense> getApprovedExpenses() {
        return barangayExpenseRepository.findByStatus(ExpenseStatus.APPROVED);
    }

    // Get total expenses for a period (approved only)
    public Double getTotalExpenses(LocalDate startDate, LocalDate endDate) {
        Double total = barangayExpenseRepository.getTotalExpensesByDateRange(startDate, endDate);
        return total != null ? total : 0.0;
    }

    // Get expense summary grouped by type
    public Map<String, Double> getExpenseSummaryByType(LocalDate startDate, LocalDate endDate) {
        List<Object[]> results = barangayExpenseRepository.getExpenseSummaryByType(startDate, endDate);
        Map<String, Double> summary = new HashMap<>();
        for (Object[] result : results) {
            summary.put(((ExpenseType) result[0]).getDisplayName(), (Double) result[1]);
        }
        return summary;
    }

    // Get expense summary grouped by fund source
    public Map<String, Double> getExpenseSummaryByFundSource(LocalDate startDate, LocalDate endDate) {
        List<Object[]> results = barangayExpenseRepository.getExpenseSummaryByFundSource(startDate, endDate);
        Map<String, Double> summary = new HashMap<>();
        for (Object[] result : results) {
            summary.put(((FundSource) result[0]).getDisplayName(), (Double) result[1]);
        }
        return summary;
    }

    // Get monthly expenses for chart
    public Map<String, Double> getMonthlyExpenses(LocalDate startDate, LocalDate endDate) {
        List<Object[]> results = barangayExpenseRepository.getMonthlyExpenses(startDate, endDate);
        Map<String, Double> monthly = new HashMap<>();
        for (Object[] result : results) {
            monthly.put(result[0].toString(), (Double) result[1]);
        }
        return monthly;
    }

    // Get today's expenses
    public Double getTodayExpenses() {
        return barangayExpenseRepository.getTodayTotalExpenses();
    }

    // Get current month expenses
    public Double getCurrentMonthExpenses() {
        return barangayExpenseRepository.getCurrentMonthExpenses();
    }

    // Get pending total amount
    public Double getPendingTotalAmount() {
        return barangayExpenseRepository.getTotalPendingExpenses();
    }
}