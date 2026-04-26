package com.example.demo.services;

import com.example.demo.model.SuggestedProgram;
import com.example.demo.repository.SuggestedProgramRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class SuggestedProgramService {

    @Autowired
    private SuggestedProgramRepository repository;

    @Autowired
    private ObjectMapper objectMapper;

    public SuggestedProgram saveSuggestedProgram(String jsonPart, Long programId) throws Exception {
        SuggestedProgram program = objectMapper.readValue(jsonPart, SuggestedProgram.class);
        program.setProgramId(programId);
        return repository.save(program);
    }

    public SuggestedProgram saveManualEntry(SuggestedProgram program) {
        if (program.getProgramName() == null || program.getProgramName().isEmpty()) {
            program.setProgramName("Unnamed Program");
        }
        return repository.save(program);
    }

    public List<SuggestedProgram> getAllSuggestedPrograms() {
        return repository.findAll();
    }

    public List<SuggestedProgram> getSuggestedProgramsByProgramId(Long programId) {
        return repository.findByProgramId(programId);
    }

    public void deleteSuggestedProgram(Long id) {
        repository.deleteById(id);
    }
}