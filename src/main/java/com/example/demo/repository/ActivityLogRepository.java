package com.example.demo.repository;

import com.example.demo.model.Activitylogs;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<Activitylogs, Long> {

    @Transactional
    void deleteByTimestampBefore(LocalDateTime cutoff);
    List<Activitylogs> findTop5ByOrderByTimestampDesc();
}