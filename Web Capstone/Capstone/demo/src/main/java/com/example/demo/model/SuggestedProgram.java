package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "suggested_programs")
public class SuggestedProgram {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "program_name")
    private String programName;

    @Column(name = "program_time")
    private LocalTime programTime;

    @Column(name = "program_endtime")
    private LocalTime programendTime;

    @Column(name = "program_date")
    private String programDate;

    @Column(name = "program_place")
    private String program_place;

    @Column(name = "program_budget")
    private int program_budget;

    @Column(name = "program_id")
    private Long programId;

    /**
     * Lifecycle status of this suggested program.
     * PROCESSING = saved by AI / admin, awaiting decision
     * ADDED      = approved and added to the calendar
     * DELETED    = removed (soft-delete; hidden from the suggestion list)
     */
    @Column(name = "status", nullable = false)
    private String status = "PROCESSING";

    /**
     * Timestamp of the last status change — used to sort the activity log.
     */
    @Column(name = "status_updated_at")
    private LocalDateTime statusUpdatedAt;

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getProgramName() { return programName; }
    public void setProgramName(String programName) { this.programName = programName; }

    public LocalTime getProgramTime() { return programTime; }
    public void setProgramTime(LocalTime programTime) { this.programTime = programTime; }

    public LocalTime getProgramendTime() { return programendTime; }
    public void setProgramendTime(LocalTime programendTime) { this.programendTime = programendTime; }

    public String getProgramDate() { return programDate; }
    public void setProgramDate(String programDate) { this.programDate = programDate; }

    public Long getProgramId() { return programId; }
    public void setProgramId(Long programId) { this.programId = programId; }

    public String getProgram_place() { return program_place; }
    public void setProgram_place(String program_place) { this.program_place = program_place; }

    public int getProgram_budget() { return program_budget; }
    public void setProgram_budget(int program_budget) { this.program_budget = program_budget; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getStatusUpdatedAt() { return statusUpdatedAt; }
    public void setStatusUpdatedAt(LocalDateTime statusUpdatedAt) { this.statusUpdatedAt = statusUpdatedAt; }
}