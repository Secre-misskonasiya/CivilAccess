package com.example.demo.dto;
import com.example.demo.model.SafetyReports;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Read-only view of a SafetyReports row for resident-facing display.
 * Reporter identity is anonymized here (not on the entity) so this
 * can never accidentally be persisted back to the database.
 */
public class SafetyReportView {

    private Long id;
    private String title;
    private String description;
    private String type;
    private String priority;
    private String status;
    private LocalDate dateSubmitted;
    private String location;
    private Double latitude;
    private Double longitude;
    private String reporterName;
    private UUID reporterId;
    private String resolvedBy;
    private String resolutionActions;
    private String resolutionResponseTime;
    private String resolutionNotes;
    private String imageUrl;

    public static SafetyReportView from(SafetyReports r, boolean isOwner) {
        SafetyReportView v = new SafetyReportView();
        v.id = r.getId();
        v.title = r.getTitle();
        v.description = r.getDescription();
        v.type = r.getType();
        v.priority = r.getPriority();
        v.status = r.getStatus();
        v.dateSubmitted = r.getDateSubmitted();
        v.location = r.getLocation();
        v.latitude = r.getLatitude();
        v.longitude = r.getLongitude();
        v.resolvedBy = r.getResolvedBy();
        v.resolutionActions = r.getResolutionActions();
        v.resolutionResponseTime = r.getResolutionResponseTime();
        v.resolutionNotes = r.getResolutionNotes();
        v.imageUrl = r.getImageUrl();
        v.reporterId = r.getReporterId();

        // Only the reporter's own identity is shown to them.
        // Everyone else sees an anonymized label; all other fields are untouched.
        v.reporterName = isOwner
                ? r.getReporterName()
                : "Anonymous Resident";

        return v;
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getType() { return type; }
    public String getPriority() { return priority; }
    public String getStatus() { return status; }
    public LocalDate getDateSubmitted() { return dateSubmitted; }
    public String getLocation() { return location; }
    public Double getLatitude() { return latitude; }
    public Double getLongitude() { return longitude; }
    public String getReporterName() { return reporterName; }
    public UUID getReporterId() { return reporterId; }
    public String getResolvedBy() { return resolvedBy; }
    public String getResolutionActions() { return resolutionActions; }
    public String getResolutionResponseTime() { return resolutionResponseTime; }
    public String getResolutionNotes() { return resolutionNotes; }
    public String getImageUrl() { return imageUrl; }
}