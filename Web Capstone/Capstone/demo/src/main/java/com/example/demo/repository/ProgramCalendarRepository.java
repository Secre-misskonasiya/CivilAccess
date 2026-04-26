package com.example.demo.repository;

import com.example.demo.model.ProgramCalendar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProgramCalendarRepository extends JpaRepository<ProgramCalendar, Long> {
    
    List<ProgramCalendar> findByProgramId(Long programId);
}