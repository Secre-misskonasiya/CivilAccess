package com.example.demo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;

public class CensusRecordDTO {

    private Long      id;
    private String    recordId;
    private String    householdId;
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
    private String    emergencyContactRelation;   // ★ ADDED
    private String    nationality;
    private String    placeOfBirth;
    private String    civilStatus;
    private String    religion;
    private String    bloodType;
    private String    idType;
    private String    hoaMembership;
    private Integer   householdMemberCount;
    private String    dwellingType;
    private String    householdMemberNames;
    private String    educationalAttainment;
    private String    employmentStatus;
    private String    monthlyIncomeRange;
    private Boolean   isIndigenousPeople;
    private String    precinctNumber;
    private String    medicalHistory;
    private String    philhealthId;
    private String    philhealthCategory;
    private String    bloodPressureHistory;
    private String    vaccCovid19;
    private String    vaccInfluenza;
    private String    vaccHpv;
    private Double    latitude;
    private Double    longitude;

    public CensusRecordDTO(
        Long id, String recordId, String householdId,
        String firstName, String middleName, String lastName, String suffix,
        String gender, LocalDate dateOfBirth, String address, String mobile,
        String occupation, String accountStatus, String censusStatus,
        String governmentIdUrl, String selfieWithIdUrl, String birthCertificate,
        String householdRelation, String homeOwnership, String evacuationPriority,
        Boolean isSeniorCitizen, Boolean isPwd, Boolean isSoloParent,
        Boolean isRegisteredVoter, Boolean is4psBeneficiary,
        String emergencyContactName, String emergencyContactNumber,
        String emergencyContactRelation,                              // ★ ADDED
        String nationality, String placeOfBirth, String civilStatus,
        String religion, String bloodType, String idType,
        String hoaMembership, Integer householdMemberCount,
        String dwellingType, String householdMemberNames,
        String educationalAttainment, String employmentStatus,
        String monthlyIncomeRange, Boolean isIndigenousPeople,
        String precinctNumber, String medicalHistory,
        String philhealthId, String philhealthCategory,
        String bloodPressureHistory, String vaccCovid19,
        String vaccInfluenza, String vaccHpv,   Double latitude,    Double longitude
    ) {
        this.id                       = id;
        this.recordId                 = recordId;
        this.householdId              = householdId;
        this.firstName                = firstName;
        this.middleName               = middleName;
        this.lastName                 = lastName;
        this.suffix                   = suffix;
        this.gender                   = gender;
        this.dateOfBirth              = dateOfBirth;
        this.address                  = address;
        this.mobile                   = mobile;
        this.occupation               = occupation;
        this.accountStatus            = accountStatus;
        this.censusStatus             = censusStatus;
        this.governmentIdUrl          = governmentIdUrl;
        this.selfieWithIdUrl          = selfieWithIdUrl;
        this.birthCertificate         = birthCertificate;
        this.householdRelation        = householdRelation;
        this.homeOwnership            = homeOwnership;
        this.evacuationPriority       = evacuationPriority;
        this.isSeniorCitizen          = isSeniorCitizen;
        this.isPwd                    = isPwd;
        this.isSoloParent             = isSoloParent;
        this.isRegisteredVoter        = isRegisteredVoter;
        this.is4psBeneficiary         = is4psBeneficiary;
        this.emergencyContactName     = emergencyContactName;
        this.emergencyContactNumber   = emergencyContactNumber;
        this.emergencyContactRelation = emergencyContactRelation;     // ★ ADDED
        this.nationality              = nationality;
        this.placeOfBirth             = placeOfBirth;
        this.civilStatus              = civilStatus;
        this.religion                 = religion;
        this.bloodType                = bloodType;
        this.idType                   = idType;
        this.hoaMembership            = hoaMembership;
        this.householdMemberCount     = householdMemberCount;
        this.dwellingType             = dwellingType;
        this.householdMemberNames     = householdMemberNames;
        this.educationalAttainment    = educationalAttainment;
        this.employmentStatus         = employmentStatus;
        this.monthlyIncomeRange       = monthlyIncomeRange;
        this.isIndigenousPeople       = isIndigenousPeople;
        this.precinctNumber           = precinctNumber;
        this.medicalHistory           = medicalHistory;
        this.philhealthId             = philhealthId;
        this.philhealthCategory       = philhealthCategory;
        this.bloodPressureHistory     = bloodPressureHistory;
        this.vaccCovid19              = vaccCovid19;
        this.vaccInfluenza            = vaccInfluenza;
        this.vaccHpv                  = vaccHpv;
        this.latitude                 = latitude;
        this.longitude                = longitude;
    }

    // ── Getters ──────────────────────────────────────────────────
    public Long      getId()                      { return id; }
    public String    getRecordId()                { return recordId; }
    public String    getHouseholdId()             { return householdId; }
    public String    getFirstName()               { return firstName; }
    public String    getMiddleName()              { return middleName; }
    public String    getLastName()                { return lastName; }
    public String    getSuffix()                  { return suffix; }
    public String    getGender()                  { return gender; }
    public LocalDate getDateOfBirth()             { return dateOfBirth; }
    public String    getAddress()                 { return address; }
    public String    getMobile()                  { return mobile; }
    public String    getOccupation()              { return occupation; }
    public String    getAccountStatus()           { return accountStatus; }
    public String    getCensusStatus()            { return censusStatus; }
    public String    getGovernmentIdUrl()         { return governmentIdUrl; }
    public String    getSelfieWithIdUrl()         { return selfieWithIdUrl; }
    public String    getBirthCertificate()        { return birthCertificate; }
    public String    getHouseholdRelation()       { return householdRelation; }
    public String    getHomeOwnership()           { return homeOwnership; }
    public String    getEvacuationPriority()      { return evacuationPriority; }

    // ★ FIXED: use is-prefix so Thymeleaf resolves r.isSeniorCitizen correctly
    public Boolean   isSeniorCitizen()            { return isSeniorCitizen; }
    public Boolean   isPwd()                      { return isPwd; }
    public Boolean   isSoloParent()               { return isSoloParent; }
    public Boolean   isRegisteredVoter()          { return isRegisteredVoter; }

    // ★ FIXED: is-prefix + @JsonProperty for JSON serialisation
    @JsonProperty("fourPsBeneficiary")
    public Boolean   is4psBeneficiary()           { return is4psBeneficiary; }

    public String    getEmergencyContactName()    { return emergencyContactName; }
    public String    getEmergencyContactNumber()  { return emergencyContactNumber; }
    public String    getEmergencyContactRelation(){ return emergencyContactRelation; } // ★ ADDED
    public String    getNationality()             { return nationality; }
    public String    getPlaceOfBirth()            { return placeOfBirth; }
    public String    getCivilStatus()             { return civilStatus; }
    public String    getReligion()                { return religion; }
    public String    getBloodType()               { return bloodType; }
    public String    getIdType()                  { return idType; }
    public String    getHoaMembership()           { return hoaMembership; }
    public Integer   getHouseholdMemberCount()    { return householdMemberCount; }
    public String    getDwellingType()            { return dwellingType; }
    public String    getHouseholdMemberNames()    { return householdMemberNames; }
    public String    getEducationalAttainment()   { return educationalAttainment; }
    public String    getEmploymentStatus()        { return employmentStatus; }
    public String    getMonthlyIncomeRange()      { return monthlyIncomeRange; }
    public Boolean   isIndigenousPeople()         { return isIndigenousPeople; } // ★ FIXED: is-prefix
    public String    getPrecinctNumber()          { return precinctNumber; }
    public String    getMedicalHistory()          { return medicalHistory; }
    public String    getPhilhealthId()            { return philhealthId; }
    public String    getPhilhealthCategory()      { return philhealthCategory; }
    public String    getBloodPressureHistory()    { return bloodPressureHistory; }
    public String    getVaccCovid19()             { return vaccCovid19; }
    public String    getVaccInfluenza()           { return vaccInfluenza; }
    public String    getVaccHpv()                 { return vaccHpv; }
    public Double    getLatitude()                { return latitude; }
    public Double    getLongitude()               { return longitude; }

    // ── Computed helpers ─────────────────────────────────────────
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
            case "UNVERIFIED" -> "unverified";
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