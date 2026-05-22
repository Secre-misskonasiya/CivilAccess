package com.example.demo.services;

import com.example.demo.model.BarangayIncome;
import com.example.demo.model.BarangayIncome.IncomeType;
import com.example.demo.model.BarangayIncome.DocumentType;
import com.example.demo.repository.BarangayIncomeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BarangayIncomeService {

    @Autowired
    private BarangayIncomeRepository barangayIncomeRepository;

    // Injected to keep budget in sync with every income transaction
    @Autowired
    private ProgramBudgetService programBudgetService;


    /**
     * Create a new income record.
     *
     * After saving, the income amount is added to the TOTAL_BUDGET record's
     * allocated amount so the overall budget pool reflects all collected funds.
     */
    @Transactional
    public BarangayIncome createIncome(BarangayIncome income) {
        if (income.getOrNumber() == null || income.getOrNumber().isEmpty()) {
            income.setOrNumber(generateORNumber());
        }
        BarangayIncome saved = barangayIncomeRepository.save(income);

        // ── Budget integration: income increases the total available budget ──
        programBudgetService.applyIncomeToBudget(saved.getAmount());

        return saved;
    }

    // Get all income records
    public List<BarangayIncome> getAllIncome() {
        return barangayIncomeRepository.findAll();
    }

    // Get income by ID
    public BarangayIncome getIncomeById(Long id) {
        return barangayIncomeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Income record not found with id: " + id));
    }

    /**
     * Update an income record.
     *
     * Reverses the old amount's effect on the budget, then applies the new amount.
     */
    @Transactional
    public BarangayIncome updateIncome(Long id, BarangayIncome incomeDetails) {
        BarangayIncome existing = getIncomeById(id);
        Double oldAmount = existing.getAmount();

        existing.setIncomeDate(incomeDetails.getIncomeDate());
        existing.setIncomeType(incomeDetails.getIncomeType());
        existing.setSourceName(incomeDetails.getSourceName());
        existing.setResidentId(incomeDetails.getResidentId());
        existing.setDocumentType(incomeDetails.getDocumentType());
        existing.setRentalItem(incomeDetails.getRentalItem());
        existing.setRentalHours(incomeDetails.getRentalHours());
        existing.setAmount(incomeDetails.getAmount());
        existing.setOrNumber(incomeDetails.getOrNumber());
        existing.setCollectedBy(incomeDetails.getCollectedBy());
        existing.setRemarks(incomeDetails.getRemarks());
        BarangayIncome saved = barangayIncomeRepository.save(existing);

        // ── Budget integration: reverse old, apply new ──
        Double newAmount = saved.getAmount();
        if (!oldAmount.equals(newAmount)) {
            programBudgetService.reverseIncomeFromBudget(oldAmount);
            programBudgetService.applyIncomeToBudget(newAmount);
        }

        return saved;
    }

    /**
     * Delete an income record.
     *
     * Reverses the income amount from the TOTAL_BUDGET so the pool shrinks
     * by the same amount that was originally added.
     */
    @Transactional
    public void deleteIncome(Long id) {
        BarangayIncome income = getIncomeById(id);
        Double amount = income.getAmount();

        barangayIncomeRepository.deleteById(id);

        // ── Budget integration: remove the deleted income from the budget pool ──
        programBudgetService.reverseIncomeFromBudget(amount);
    }

    // Get income by date range
    public List<BarangayIncome> getIncomeByDateRange(LocalDate startDate, LocalDate endDate) {
        return barangayIncomeRepository.findByIncomeDateBetween(startDate, endDate);
    }

    // Get income by type
    public List<BarangayIncome> getIncomeByType(IncomeType type) {
        return barangayIncomeRepository.findByIncomeType(type);
    }

    // Get income by resident
    public List<BarangayIncome> getIncomeByResident(Long residentId) {
        return barangayIncomeRepository.findByResidentId(residentId);
    }

    // Get total income for a period
    public Double getTotalIncome(LocalDate startDate, LocalDate endDate) {
        Double total = barangayIncomeRepository.getTotalIncomeByDateRange(startDate, endDate);
        return total != null ? total : 0.0;
    }

    // Get total document fee income
    public Double getTotalDocumentFeeIncome(LocalDate startDate, LocalDate endDate) {
        Double total = barangayIncomeRepository.getTotalDocumentFeeIncome(startDate, endDate);
        return total != null ? total : 0.0;
    }

    // Get total rental income
    public Double getTotalRentalIncome(LocalDate startDate, LocalDate endDate) {
        Double total = barangayIncomeRepository.getTotalRentalIncome(startDate, endDate);
        return total != null ? total : 0.0;
    }

    // Get income summary grouped by type for dashboard
    public Map<String, Double> getIncomeSummary(LocalDate startDate, LocalDate endDate) {
        List<Object[]> results = barangayIncomeRepository.getIncomeSummaryByType(startDate, endDate);
        Map<String, Double> summary = new HashMap<>();
        for (Object[] result : results) {
            summary.put(((IncomeType) result[0]).getDisplayName(), (Double) result[1]);
        }
        return summary;
    }

    // Get monthly income for chart
    public Map<String, Double> getMonthlyIncome(LocalDate startDate, LocalDate endDate) {
        List<Object[]> results = barangayIncomeRepository.getMonthlyIncome(startDate, endDate);
        Map<String, Double> monthly = new HashMap<>();
        for (Object[] result : results) {
            monthly.put(result[0].toString(), (Double) result[1]);
        }
        return monthly;
    }

    // Get today's income
    public Double getTodayIncome() {
        return barangayIncomeRepository.getTodayTotalIncome();
    }

    // Get current month income
    public Double getCurrentMonthIncome() {
        return barangayIncomeRepository.getCurrentMonthIncome();
    }

    // Get current year income
    public Double getCurrentYearIncome() {
        return barangayIncomeRepository.getCurrentYearIncome();
    }

    // Get document fee income by document type
    public Map<String, Double> getDocumentFeeBreakdown(LocalDate startDate, LocalDate endDate) {
        Map<String, Double> breakdown = new HashMap<>();
        for (DocumentType type : DocumentType.values()) {
            Double amount = barangayIncomeRepository.getIncomeByDocumentType(type, startDate, endDate);
            breakdown.put(type.getDisplayName(), amount != null ? amount : 0.0);
        }
        return breakdown;
    }

    // ========== ARCHIVE METHODS ==========

    /**
     * Archive an income record (soft-delete).
     * Only the Treasurer role may call this endpoint.
     * The income amount is reversed from the budget pool so available funds
     * reflect only active (non-archived) income.
     */
    @Transactional
    public BarangayIncome archiveIncome(Long id, Long archivedBy) {
        BarangayIncome income = getIncomeById(id);

        if (Boolean.TRUE.equals(income.getArchived())) {
            throw new RuntimeException("Income #" + id + " is already archived.");
        }

        // Remove this income from the live budget pool
        programBudgetService.reverseIncomeFromBudget(income.getAmount());

        income.setArchived(true);
        income.setArchivedAt(LocalDateTime.now());
        income.setArchivedBy(archivedBy);
        return barangayIncomeRepository.save(income);
    }

    /**
     * Restore an archived income record back to active.
     * Re-adds the amount to the live budget pool.
     */
    @Transactional
    public BarangayIncome unarchiveIncome(Long id) {
        BarangayIncome income = getIncomeById(id);

        if (!Boolean.TRUE.equals(income.getArchived())) {
            throw new RuntimeException("Income #" + id + " is not archived.");
        }

        income.setArchived(false);
        income.setArchivedAt(null);
        income.setArchivedBy(null);
        BarangayIncome saved = barangayIncomeRepository.save(income);

        // Restore the income to the live budget pool
        programBudgetService.applyIncomeToBudget(saved.getAmount());

        return saved;
    }

    // Get all archived income records
    public List<BarangayIncome> getArchivedIncome() {
        return barangayIncomeRepository.findByArchivedTrue();
    }

    // Get all active (non-archived) income records
    public List<BarangayIncome> getActiveIncome() {
        return barangayIncomeRepository.findByArchivedFalseOrArchivedIsNull();
    }

    // Generate OR number (e.g., OR-2026-00001)
    // Queries the DB for the highest existing number so it is safe across server restarts.
    private synchronized String generateORNumber() {
        int currentYear = LocalDate.now().getYear();
        int maxNumber = 0;
        try {
            List<BarangayIncome> allIncome = barangayIncomeRepository.findAll();
            for (BarangayIncome inc : allIncome) {
                String or = inc.getOrNumber();
                if (or != null) {
                    // Extract the trailing digits from any format, e.g. "OR-2025-00003" → "00003"
                    String digits = or.replaceAll(".*?(\\d{1,10})$", "$1");
                    try {
                        int num = Integer.parseInt(digits);
                        if (num > maxNumber) maxNumber = num;
                    } catch (NumberFormatException ignored) {}
                }
            }
        } catch (Exception e) {
            // Fallback: use timestamp suffix to guarantee uniqueness
            return String.format("OR-%d-%d", currentYear, System.currentTimeMillis());
        }
        return String.format("OR-%d-%05d", currentYear, maxNumber + 1);
    }
}