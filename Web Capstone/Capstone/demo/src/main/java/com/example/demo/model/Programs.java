package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "programs")
public class Programs {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String programTitle;

    @Column(columnDefinition = "TEXT")
    private String programDescription;

    private String category;
    
    private boolean recommendedByAi;
    
    private Double estimatedBudget;

    private String status; 

    private Long createdBy; 

    private LocalDateTime createdAt;

    
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getProgramTitle() { return programTitle; }
    public void setProgramTitle(String programTitle) { this.programTitle = programTitle; }

    public String getProgramDescription() { return programDescription; }
    public void setProgramDescription(String programDescription) { this.programDescription = programDescription; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public boolean isRecommendedByAi() { return recommendedByAi; }
    public void setRecommendedByAi(boolean recommendedByAi) { this.recommendedByAi = recommendedByAi; }

    public Double getEstimatedBudget() { return estimatedBudget; }
    public void setEstimatedBudget(Double estimatedBudget) { this.estimatedBudget = estimatedBudget; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}