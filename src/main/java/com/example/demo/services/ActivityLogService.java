package com.example.demo.services;

import com.example.demo.model.Activitylogs;
import com.example.demo.repository.ActivityLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ActivityLogService {

    @Autowired
    private ActivityLogRepository activityLogRepository;

    public List<Activitylogs> getAllLogs() {
        return activityLogRepository.findAll(Sort.by(Sort.Direction.DESC, "timestamp"));
    }

    // NEW: fetches only N most recent logs at DB level — no full table scan
    public List<Activitylogs> getRecentLogs(int limit) {
        return activityLogRepository.findAll(
            PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "timestamp"))
        ).getContent();
    }
    public org.springframework.data.domain.Page<Activitylogs> getLogsPaginated(int page, int size) {
    return activityLogRepository.findAll(
        PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp"))
    );
}
    public void log(String userName, String userRole,
                    String action, String module,
                    String details, String ipAddress, String status) {

        Activitylogs log = new Activitylogs();
        log.setUserName(userName);
        log.setUserRole(userRole);
        log.setAction(action);
        log.setModule(module);
        log.setDetails(details);
        log.setIpAddress(ipAddress);
        log.setStatus(status);
        log.setTimestamp(LocalDateTime.now());

        activityLogRepository.save(log);
    }
}