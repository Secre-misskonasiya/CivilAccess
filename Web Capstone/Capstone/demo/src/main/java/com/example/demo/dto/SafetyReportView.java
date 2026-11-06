
package com.example.demo.dto;

import java.time.LocalDate;

import com.example.demo.model.SafetyReports;

public class SafetyReportView {

    private Long id;
    private String reporterId;
    private String reporterName;
    private boolean mine;
    private String status;
    private String type;
    private String title;
    private String description;
    private LocalDate dateSubmitted;
    private String location;
    private Double latitude;
    private Double longitude;
    private String priority;
    private String resolvedBy;
    private String resolutionActions;
    private String resolutionNotes;
    private String resolutionResponseTime;
    private String imageUrl;

    public static SafetyReportView from(
            SafetyReports report,
            boolean isOwner) {

        SafetyReportView view = new SafetyReportView();

        view.id = report.getId();
        view.mine = isOwner;

        view.reporterId = (isOwner && report.getUserId() != null)
                ? report.getUserId().toString()
                : null;

        view.reporterName = isOwner
                ? (report.getReporterName() != null
                        && !report.getReporterName().isBlank()
                                ? report.getReporterName()
                                : "You")
                : "Anonymous Resident";

        view.status = report.getStatus() != null
                ? report.getStatus()
                : "INCOMING";

        view.type = report.getType();
        view.title = report.getTitle();
        view.description = report.getDescription();
        view.dateSubmitted = report.getDateSubmitted();
        view.location = report.getLocation();
        view.latitude = report.getLatitude();
        view.longitude = report.getLongitude();

        view.priority = report.getPriority() != null
                ? report.getPriority()
                : "MEDIUM";

        view.resolvedBy = report.getResolvedBy();
        view.resolutionActions = report.getResolutionActions();
        view.resolutionNotes = report.getResolutionNotes();

        view.resolutionResponseTime =
                report.getResolutionResponseTime() != null
                        ? report.getResolutionResponseTime()
                        : null;

        view.imageUrl = report.getImageUrl();

        return view;
    }

    // =========================
    // GETTERS AND SETTERS
    // =========================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getReporterId() {
        return reporterId;
    }

    public void setReporterId(String reporterId) {
        this.reporterId = reporterId;
    }

    public String getReporterName() {
        return reporterName;
    }

    public void setReporterName(String reporterName) {
        this.reporterName = reporterName;
    }

    public boolean isMine() {
        return mine;
    }

    public void setMine(boolean mine) {
        this.mine = mine;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDate getDateSubmitted() {
        return dateSubmitted;
    }

    public void setDateSubmitted(LocalDate dateSubmitted) {
        this.dateSubmitted = dateSubmitted;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getResolvedBy() {
        return resolvedBy;
    }

    public void setResolvedBy(String resolvedBy) {
        this.resolvedBy = resolvedBy;
    }

    public String getResolutionActions() {
        return resolutionActions;
    }

    public void setResolutionActions(String resolutionActions) {
        this.resolutionActions = resolutionActions;
    }

    public String getResolutionNotes() {
        return resolutionNotes;
    }

    public void setResolutionNotes(String resolutionNotes) {
        this.resolutionNotes = resolutionNotes;
    }

    public String getResolutionResponseTime() {
        return resolutionResponseTime;
    }

    public void setResolutionResponseTime(String resolutionResponseTime) {
        this.resolutionResponseTime = resolutionResponseTime;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
}
