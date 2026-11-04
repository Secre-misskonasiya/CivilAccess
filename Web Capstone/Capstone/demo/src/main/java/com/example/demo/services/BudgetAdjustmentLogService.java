package com.example.demo.services;

import com.example.demo.model.BudgetAdjustmentLog;
import com.example.demo.repository.BudgetAdjustmentLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class BudgetAdjustmentLogService {

    @Autowired
    private BudgetAdjustmentLogRepository repo;

    public BudgetAdjustmentLog logAdjustment(BudgetAdjustmentLog.AdjustmentType type,
                                              Double amount, String reason,
                                              Long adjustedBy, String adjustedByName) {
        BudgetAdjustmentLog log = new BudgetAdjustmentLog();
        log.setType(type);
        log.setAmount(amount);
        log.setReason(reason);
        log.setAdjustedBy(adjustedBy);
        log.setAdjustedByName(adjustedByName);
        return repo.save(log);
    }

    public List<BudgetAdjustmentLog> getRecentLogs() {
        return repo.findAllByOrderByDateDesc();
    }
}