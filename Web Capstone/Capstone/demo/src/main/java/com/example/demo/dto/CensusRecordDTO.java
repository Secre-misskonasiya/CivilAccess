package com.example.demo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;

public class CensusRecordDTO {

    private Long      id;
    private String    recordId;
    private String    firstName;
    private String    middleName;
    private String    lastName;
    private String    suffix;
    private String    gender;
    private LocalDate dateOfBirth;
    private String    address;
    private String    mobile;
    private String    occupation;
    private String    accountStatus;
    private String    censusStatus;
    private String    governmentIdUrl;
    private String    selfieWithIdUrl;
    private String    birthCertificate;
    private String    householdRelation;
    private String    homeOwnership;
    private String    evacuationPriority;
    private Boolean   isSeniorCitizen;
    private Boolean   isPwd;
    private Boolean   isSoloParent;
    private Boolean   isRegisteredVoter;
    private Boolean   is4psBeneficiary;
    private String    emergencyContactName;
    private String    emergencyContactNumber;

    public CensusRecordDTO(
        Long id, String recordId,
        String firstName, String middleName, String lastName, String suffix,
        String gender, LocalDate dateOfBirth, String address, String mobile,
        String occupation, String accountStatus, String censusStatus,
        String governmentIdUrl, String selfieWithIdUrl, String birthCertificate,
        String householdRelation, String homeOwnership, String evacuationPriority,
        Boolean isSeniorCitizen, Boolean isPwd, Boolean isSoloParent,
        Boolean isRegisteredVoter, Boolean is4psBeneficiary,
        String emergencyContactName, String emergencyContactNumber
    ) {
        this.id                    = id;
        this.recordId              = recordId;
        this.firstName             = firstName;
        this.middleName            = middleName;
        this.lastName              = lastName;
        this.suffix                = suffix;
        this.gender                = gender;
        this.dateOfBirth           = dateOfBirth;
        this.address               = address;
        this.mobile                = mobile;
        this.occupation            = occupation;
        this.accountStatus         = accountStatus;
        this.censusStatus          = censusStatus;
        this.governmentIdUrl       = governmentIdUrl;
        this.selfieWithIdUrl       = selfieWithIdUrl;
        this.birthCertificate      = birthCertificate;
        this.householdRelation     = householdRelation;
        this.homeOwnership         = homeOwnership;
        this.evacuationPriority    = evacuationPriority;
        this.isSeniorCitizen       = isSeniorCitizen;
        this.isPwd                 = isPwd;
        this.isSoloParent          = isSoloParent;
        this.isRegisteredVoter     = isRegisteredVoter;
        this.is4psBeneficiary      = is4psBeneficiary;
        this.emergencyContactName  = emergencyContactName;
        this.emergencyContactNumber = emergencyContactNumber;
    }

    // ── Getters ──────────────────────────────────────────────────

    public Long      getId()                    { return id; }
    public String    getRecordId()              { return recordId; }
    public String    getFirstName()             { return firstName; }
    public String    getMiddleName()            { return middleName; }
    public String    getLastName()              { return lastName; }
    public String    getSuffix()                { return suffix; }
    public String    getGender()                { return gender; }
    public LocalDate getDateOfBirth()           { return dateOfBirth; }
    public String    getAddress()               { return address; }
    public String    getMobile()                { return mobile; }
    public String    getOccupation()            { return occupation; }
    public String    getAccountStatus()         { return accountStatus; }
    public String    getCensusStatus()          { return censusStatus; }
    public String    getGovernmentIdUrl()       { return governmentIdUrl; }
    public String    getSelfieWithIdUrl()       { return selfieWithIdUrl; }
    public String    getBirthCertificate()      { return birthCertificate; }
    public String    getHouseholdRelation()     { return householdRelation; }
    public String    getHomeOwnership()         { return homeOwnership; }
    public String    getEvacuationPriority()    { return evacuationPriority; }
    public Boolean   getSeniorCitizen()         { return isSeniorCitizen; }
    public Boolean   getPwd()                   { return isPwd; }
    public Boolean   getSoloParent()            { return isSoloParent; }
    public Boolean   getRegisteredVoter()       { return isRegisteredVoter; }

    // @JsonProperty prevents Jackson from serializing this as "4psBeneficiary"
    // which is an invalid JS identifier — it will be "fourPsBeneficiary" in JSON
    @JsonProperty("fourPsBeneficiary")
    public Boolean   get4psBeneficiary()        { return is4psBeneficiary; }

    public String    getEmergencyContactName()  { return emergencyContactName; }
    public String    getEmergencyContactNumber(){ return emergencyContactNumber; }

    // ── Computed helpers (used by Thymeleaf templates) ───────────

    public String fullName() {
        return ((firstName  != null ? firstName  : "") + " "
              + (middleName != null ? middleName + " " : "")
              + (lastName   != null ? lastName   : "")
              + (suffix     != null ? " " + suffix : "")).trim();
    }

    public Integer age() {
        if (dateOfBirth == null) return null;
        return java.time.Period.between(dateOfBirth, LocalDate.now()).getYears();
    }

    public String statusClass() {
        if (censusStatus == null) return "pending";
        return switch (censusStatus.toUpperCase()) {
            case "COMPLETE"   -> "complete";
            case "INCOMPLETE" -> "incomplete";
            case "FLAGGED"    -> "flagged";
            case "ARCHIVED"   -> "archived";
            default           -> "pending";
        };
    }

    public int sectionsComplete() {
        boolean s1 = firstName != null && lastName != null && dateOfBirth != null && address != null;
        boolean s2 = householdRelation != null && homeOwnership != null;
        boolean s3 = emergencyContactName != null && emergencyContactNumber != null;
        if (s1 && s2 && s3) return 3;
        if (s1 && s2)       return 2;
        if (s1)             return 1;
        return 0;
    }
}