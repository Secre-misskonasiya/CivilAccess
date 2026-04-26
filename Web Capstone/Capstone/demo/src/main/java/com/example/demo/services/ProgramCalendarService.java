package com.example.demo.services;

import com.example.demo.model.ProgramCalendar;
import com.example.demo.repository.ProgramCalendarRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ProgramCalendarService {

    private final ProgramCalendarRepository repository;
    private final ObjectMapper objectMapper; 

    public ProgramCalendarService(ProgramCalendarRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    public ProgramCalendar createEventFromRecommendation(String jsonPart, Long programId) throws Exception {
        ProgramCalendar event = objectMapper.readValue(jsonPart, ProgramCalendar.class);

        if (event.getEventDate() == null || event.getStartTime() == null || event.getLocation() == null) {
            throw new IllegalArgumentException("Incomplete event details found in the AI response.");
        }

        event.setProgramId(programId);
        return repository.save(event);
    }
    
    public List<ProgramCalendar> getAllEvents() {
        return repository.findAll();
    }

    public List<ProgramCalendar> getEventsByProgram(Long programId) {
        return repository.findByProgramId(programId);
    }

    public ProgramCalendar saveEvent(ProgramCalendar event) {
        
        if (event.getProgramBudget() == null) {
            event.setProgramBudget(0);
        }
        return repository.save(event);
    }

    public void deleteEvent(Long id) {
        repository.deleteById(id);
    }
}