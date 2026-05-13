package com.example.demo.repository;

import com.example.demo.model.ProgramBudget;
import com.example.demo.model.ProgramBudget.BudgetStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProgramBudgetRepository extends JpaRepository<ProgramBudget, Long> {

    // ========== EXISTING METHODS (KEPT) ==========

    List<ProgramBudget> findByProgramId(Long programId);

    @Query("SELECT COALESCE(SUM(b.amount), 0) FROM ProgramBudget b")
    Double getTotalBudget();

    // ========== EXISTING NEW METHODS (KEPT) ==========

    List<ProgramBudget> findByBudgetStatus(BudgetStatus budgetStatus);

    Optional<ProgramBudget> findByProgramIdAndBudgetItem(Long programId, String budgetItem);

    @Query("SELECT COALESCE(SUM(pb.amount), 0) FROM ProgramBudget pb WHERE pb.programId = :programId")
    Double getTotalAllocatedBudgetByProgramId(@Param("programId") Long programId);

    @Query("SELECT COALESCE(SUM(pb.actualSpent), 0) FROM ProgramBudget pb WHERE pb.programId = :programId")
    Double getTotalActualSpentByProgramId(@Param("programId") Long programId);

    @Query("SELECT COALESCE(SUM(pb.remainingBudget), 0) FROM ProgramBudget pb WHERE pb.programId = :programId")
    Double getTotalRemainingBudgetByProgramId(@Param("programId") Long programId);

    @Query("SELECT pb FROM ProgramBudget pb WHERE pb.fiscalYear = :fiscalYear")
    List<ProgramBudget> findByFiscalYear(@Param("fiscalYear") Integer fiscalYear);

    @Query("SELECT pb FROM ProgramBudget pb WHERE pb.budgetStatus = 'OVER_BUDGET' AND pb.amount > 0")
    List<ProgramBudget> findOverBudgetItems();

    @Modifying
    @Transactional
    @Query("UPDATE ProgramBudget pb SET pb.actualSpent = pb.actualSpent + :amount, " +
           "pb.remainingBudget = pb.remainingBudget - :amount WHERE pb.id = :id")
    int addToActualSpent(@Param("id") Long id, @Param("amount") Double amount);

    @Modifying
    @Transactional
    @Query("UPDATE ProgramBudget pb SET pb.budgetStatus = " +
           "CASE WHEN pb.actualSpent > pb.amount THEN 'OVER_BUDGET' " +
           "WHEN pb.actualSpent < pb.amount THEN 'UNDER_BUDGET' " +
           "ELSE 'ON_TRACK' END " +
           "WHERE pb.programId = :programId")
    void updateBudgetStatusForProgram(@Param("programId") Long programId);

    @Query("SELECT (pb.remainingBudget >= :requestedAmount) FROM ProgramBudget pb WHERE pb.id = :id")
    boolean hasSufficientBudget(@Param("id") Long id, @Param("requestedAmount") Double requestedAmount);

    @Query("SELECT COALESCE(SUM(pb.remainingBudget), 0) FROM ProgramBudget pb")
    Double getTotalRemainingBudget();

    @Query("SELECT COALESCE(SUM(pb.actualSpent), 0) FROM ProgramBudget pb")
    Double getTotalActualSpent();

    // ========== NEW: TOTAL_BUDGET RECORD LOOKUP ==========

    /**
     * Finds the single master TOTAL_BUDGET record (programId = 0).
     * Used by income/expense integration to update the global budget pool.
     */
    @Query("SELECT pb FROM ProgramBudget pb WHERE pb.budgetItem = 'TOTAL_BUDGET' AND pb.programId = 0")
    Optional<ProgramBudget> findTotalBudgetRecord();
}