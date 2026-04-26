package com.example.demo.repository;

import com.example.demo.model.ProgramBudget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProgramBudgetRepository extends JpaRepository<ProgramBudget, Long> {

    List<ProgramBudget> findByProgramId(Long programId);

    @Query("SELECT COALESCE(SUM(b.amount), 0) FROM ProgramBudget b")
    Double getTotalBudget();
}