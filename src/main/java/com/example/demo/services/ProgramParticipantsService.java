package com.example.demo.services;

import com.example.demo.model.ProgramParticipants;
import com.example.demo.repository.ProgramParticipantsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ProgramParticipantsService {

    @Autowired
    private ProgramParticipantsRepository repository;

    public List<ProgramParticipants> getAllParticipants() {
        return repository.findAll();
    }

    public List<ProgramParticipants> getParticipantsByProgram(Long programId) {
        return repository.findByProgramId(programId);
    }

}