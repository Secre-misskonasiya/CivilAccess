package com.example.demo.repository;

import com.example.demo.model.BudgetAdjustmentLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BudgetAdjustmentLogRepository extends JpaRepository<BudgetAdjustmentLog, Long> {
    List<BudgetAdjustmentLog> findAllByOrderByDateDesc();
}