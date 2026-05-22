package com.example.demo.repository;

import com.example.demo.model.BarangayExpense;
import com.example.demo.model.BarangayExpense.ExpenseType;
import com.example.demo.model.BarangayExpense.FundSource;
import com.example.demo.model.BarangayExpense.ExpenseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BarangayExpenseRepository extends JpaRepository<BarangayExpense, Long> {

    // Find by expense type
    List<BarangayExpense> findByExpenseType(ExpenseType expenseType);

    // Find by fund source
    List<BarangayExpense> findByFundSource(FundSource fundSource);

    // Find by status (PENDING or APPROVED)
    List<BarangayExpense> findByStatus(ExpenseStatus status);

    // Find by date range
    List<BarangayExpense> findByExpenseDateBetween(LocalDate startDate, LocalDate endDate);

    // Find by program ID
    List<BarangayExpense> findByProgramId(Long programId);

    // Find by created by
    List<BarangayExpense> findByCreatedBy(Long createdBy);

    // Find pending expenses that need approval (ordered by date) — excludes archived
    List<BarangayExpense> findByStatusOrderByExpenseDateDesc(ExpenseStatus status);

    // Find pending expenses excluding archived ones (used for the approval queue)
    @Query("SELECT be FROM BarangayExpense be WHERE be.status = :status AND (be.archived = false OR be.archived IS NULL) ORDER BY be.expenseDate DESC")
    List<BarangayExpense> findActiveByStatusOrderByExpenseDateDesc(@Param("status") ExpenseStatus status);

    // Get total expenses by date range (APPROVED only)
    @Query("SELECT COALESCE(SUM(be.amount), 0) FROM BarangayExpense be " +
           "WHERE be.expenseDate BETWEEN :startDate AND :endDate AND be.status = 'APPROVED'")
    Double getTotalExpensesByDateRange(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    // Get total expenses grouped by type (APPROVED only)
    @Query("SELECT be.expenseType, COALESCE(SUM(be.amount), 0) FROM BarangayExpense be " +
           "WHERE be.expenseDate BETWEEN :startDate AND :endDate AND be.status = 'APPROVED' " +
           "GROUP BY be.expenseType")
    List<Object[]> getExpenseSummaryByType(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    // Get total expenses grouped by fund source (APPROVED only)
    @Query("SELECT be.fundSource, COALESCE(SUM(be.amount), 0) FROM BarangayExpense be " +
           "WHERE be.expenseDate BETWEEN :startDate AND :endDate AND be.status = 'APPROVED' " +
           "GROUP BY be.fundSource")
    List<Object[]> getExpenseSummaryByFundSource(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    // Get monthly expenses for chart (APPROVED only)
    @Query("SELECT FUNCTION('DATE_FORMAT', be.expenseDate, '%Y-%m') as month, COALESCE(SUM(be.amount), 0) " +
           "FROM BarangayExpense be WHERE be.expenseDate BETWEEN :startDate AND :endDate AND be.status = 'APPROVED' " +
           "GROUP BY FUNCTION('DATE_FORMAT', be.expenseDate, '%Y-%m') ORDER BY month")
    List<Object[]> getMonthlyExpenses(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    // Get total expenses per program (APPROVED only)
    @Query("SELECT be.programId, COALESCE(SUM(be.amount), 0) FROM BarangayExpense be " +
           "WHERE be.programId IS NOT NULL AND be.status = 'APPROVED' " +
           "GROUP BY be.programId")
    List<Object[]> getExpensesPerProgram();

    // Get total pending expenses (not yet approved)
    @Query("SELECT COALESCE(SUM(be.amount), 0) FROM BarangayExpense be WHERE be.status = 'PENDING'")
    Double getTotalPendingExpenses();

    // Get today's total expenses (APPROVED only)
    @Query("SELECT COALESCE(SUM(be.amount), 0) FROM BarangayExpense be " +
           "WHERE be.expenseDate = CURRENT_DATE AND be.status = 'APPROVED'")
    Double getTodayTotalExpenses();

    // Get current month expenses (APPROVED only)
    @Query("SELECT COALESCE(SUM(be.amount), 0) FROM BarangayExpense be " +
           "WHERE YEAR(be.expenseDate) = YEAR(CURRENT_DATE) AND MONTH(be.expenseDate) = MONTH(CURRENT_DATE) " +
           "AND be.status = 'APPROVED'")
    Double getCurrentMonthExpenses();

    // Update expense status
    @Modifying
    @Transactional
    @Query("UPDATE BarangayExpense be SET be.status = :status WHERE be.id = :id")
    int updateExpenseStatus(@Param("id") Long id, @Param("status") ExpenseStatus status);

    // Get expenses pending approval for more than 7 days
    @Query("SELECT be FROM BarangayExpense be WHERE be.status = 'PENDING' AND be.createdAt <= :date")
    List<BarangayExpense> findPendingExpensesOlderThan(@Param("date") LocalDate date);

    // ── Archive queries ──────────────────────────────────────────────────────

    // All archived expense records
    List<BarangayExpense> findByArchivedTrue();

    // All active (non-archived) expense records
    List<BarangayExpense> findByArchivedFalseOrArchivedIsNull();
}