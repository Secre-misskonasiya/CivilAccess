package com.example.demo.repository;

import com.example.demo.model.ProgramParticipants;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProgramParticipantsRepository extends JpaRepository<ProgramParticipants, Long> {
    
    List<ProgramParticipants> findByProgramId(Long programId);
}