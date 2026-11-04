package com.example.demo.repository;

import com.example.demo.model.BarangayIncome;
import com.example.demo.model.BarangayIncome.IncomeType;
import com.example.demo.model.BarangayIncome.DocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BarangayIncomeRepository extends JpaRepository<BarangayIncome, Long> {

    // Find by income type
    List<BarangayIncome> findByIncomeType(IncomeType incomeType);
    
    // Find by document type
    List<BarangayIncome> findByDocumentType(DocumentType documentType);
    
    // Find by date range
    List<BarangayIncome> findByIncomeDateBetween(LocalDate startDate, LocalDate endDate);
    
    // Find by resident ID
    List<BarangayIncome> findByResidentId(Long residentId);
    
    // FIXED: Use @Query instead of method naming
    @Query("SELECT bi FROM BarangayIncome bi WHERE bi.orNumber = :orNumber")
    Optional<BarangayIncome> findByOrNumber(@Param("orNumber") String orNumber);
    
    // Find by collected by
    List<BarangayIncome> findByCollectedBy(Long collectedBy);
    
    // Get total income by date range
    @Query("SELECT COALESCE(SUM(bi.amount), 0) FROM BarangayIncome bi WHERE bi.incomeDate BETWEEN :startDate AND :endDate")
    Double getTotalIncomeByDateRange(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    // Get total income grouped by type
    @Query("SELECT bi.incomeType, COALESCE(SUM(bi.amount), 0) FROM BarangayIncome bi " +
           "WHERE bi.incomeDate BETWEEN :startDate AND :endDate GROUP BY bi.incomeType")
    List<Object[]> getIncomeSummaryByType(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    // Get monthly income for chart
    @Query("SELECT FUNCTION('DATE_FORMAT', bi.incomeDate, '%Y-%m') as month, COALESCE(SUM(bi.amount), 0) " +
           "FROM BarangayIncome bi WHERE bi.incomeDate BETWEEN :startDate AND :endDate " +
           "GROUP BY FUNCTION('DATE_FORMAT', bi.incomeDate, '%Y-%m') ORDER BY month")
    List<Object[]> getMonthlyIncome(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    // Get total rental income only
    @Query("SELECT COALESCE(SUM(bi.amount), 0) FROM BarangayIncome bi " +
           "WHERE bi.incomeType = 'RENTAL' AND bi.incomeDate BETWEEN :startDate AND :endDate")
    Double getTotalRentalIncome(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    // Get total document fee income only
    @Query("SELECT COALESCE(SUM(bi.amount), 0) FROM BarangayIncome bi " +
           "WHERE bi.incomeType = 'DOCUMENT_FEE' AND bi.incomeDate BETWEEN :startDate AND :endDate")
    Double getTotalDocumentFeeIncome(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    // Get income by specific document type
    @Query("SELECT COALESCE(SUM(bi.amount), 0) FROM BarangayIncome bi " +
           "WHERE bi.documentType = :documentType AND bi.incomeDate BETWEEN :startDate AND :endDate")
    Double getIncomeByDocumentType(@Param("documentType") DocumentType documentType,
                                   @Param("startDate") LocalDate startDate,
                                   @Param("endDate") LocalDate endDate);
    
    // Get today's total income
    @Query("SELECT COALESCE(SUM(bi.amount), 0) FROM BarangayIncome bi WHERE bi.incomeDate = CURRENT_DATE")
    Double getTodayTotalIncome();
    
    // Get current month income
    @Query("SELECT COALESCE(SUM(bi.amount), 0) FROM BarangayIncome bi " +
           "WHERE YEAR(bi.incomeDate) = YEAR(CURRENT_DATE) AND MONTH(bi.incomeDate) = MONTH(CURRENT_DATE)")
    Double getCurrentMonthIncome();
    
    // Get current year income
    @Query("SELECT COALESCE(SUM(bi.amount), 0) FROM BarangayIncome bi WHERE YEAR(bi.incomeDate) = YEAR(CURRENT_DATE)")
    Double getCurrentYearIncome();

    // ── Archive queries ──────────────────────────────────────────────────────

    // All archived income records
    List<BarangayIncome> findByArchivedTrue();

    // All active (non-archived) income records
    List<BarangayIncome> findByArchivedFalseOrArchivedIsNull();
}