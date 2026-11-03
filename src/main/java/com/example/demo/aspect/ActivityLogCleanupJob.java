package com.example.demo.aspect;

import com.example.demo.repository.ActivityLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;

@Component
public class ActivityLogCleanupJob {

    @Autowired
    private ActivityLogRepository activityLogRepository;

    @Scheduled(cron = "0 0 0 * * *")
    public void deleteOldLogs() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(90);
        activityLogRepository.deleteByTimestampBefore(cutoff);
    }
}