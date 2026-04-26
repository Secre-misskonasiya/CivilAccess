package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;

import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "program_calendar")
public class ProgramCalendar {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long programId; 

    private LocalDate eventDate;
    private LocalTime startTime;
    private LocalTime endTime;
    
    private String location;
 
    @Column(name = "program_budget")
    @JsonProperty("program_budget")
    private Integer programBudget;

    @Column(columnDefinition = "TEXT")
    private String notes;

    
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getProgramId() { return programId; }
    public void setProgramId(Long programId) { this.programId = programId; }

    public LocalDate getEventDate() { return eventDate; }
    public void setEventDate(LocalDate eventDate) { this.eventDate = eventDate; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

        
    public Integer getProgramBudget() { return programBudget; }
    public void setProgramBudget(Integer programBudget) { this.programBudget = programBudget; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}