package com.example.demo.dto;

import java.time.LocalDate;

public interface CensusView {
    Long      getId();
    String    getRecordId();
    String    getHouseholdId();
    String    getFirstName();
    String    getMiddleName();
    String    getLastName();
    String    getSuffix();
    String    getGender();
    LocalDate getDateOfBirth();
    String    getMobile();
    String    getAddress();
    String    getOccupation();
    String    getCensusStatus();
    String    getAccountStatus();
    String    getEvacuationPriority();
    String    getGovernmentIdUrl();
    String    getSelfieWithIdUrl();
    String    getBirthCertificate();
    String    getEmergencyContactName();
    String    getEmergencyContactNumber();
    String    getEmergencyContactRelation();
    String    getHomeOwnership();
    String    getHouseholdRelation();
    
    // New fields
    String    getNationality();
    String    getPlaceOfBirth();
    String    getCivilStatus();
    String    getReligion();
    String    getBloodType();
    String    getIdType();
    String    getHoaMembership();
    Integer   getHouseholdMemberCount();
    String    getDwellingType();
    String    getHouseholdMemberNames();
    String    getEducationalAttainment();
    String    getEmploymentStatus();
    String    getMonthlyIncomeRange();
    String    getPrecinctNumber();
    String    getMedicalHistory();
    String    getPhilhealthId();
    String    getPhilhealthCategory();
    String    getBloodPressureHistory();
    String    getVaccCovid19();
    String    getVaccInfluenza();
    String    getVaccHpv();
    
    // Boolean flags
    boolean   isSeniorCitizen();
    boolean   isPwd();
    boolean   isSoloParent();
    boolean   isRegisteredVoter();
    boolean   is4psBeneficiary();
    boolean   isIndigenousPeople();
}