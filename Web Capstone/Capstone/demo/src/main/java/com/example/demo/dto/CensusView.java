package com.example.demo.dto;

import java.time.LocalDate;

public interface CensusView {
    Long      getId();
    String    getRecordId();
    String    getFirstName();
    String    getLastName();
    String    getGender();
    LocalDate getDateOfBirth();
    String    getMobile();
    String    getAddress();
    String    getCensusStatus();
    String    getAccountStatus();
    String    getEvacuationPriority();
    String    getGovernmentIdUrl();
    String    getSelfieWithIdUrl();
    String    getEmergencyContactName();
    String    getEmergencyContactNumber();
    String    getHomeOwnership();
    String    getHouseholdRelation();
    String    getOccupation();
    boolean   isSeniorCitizen();
    boolean   isPwd();
}