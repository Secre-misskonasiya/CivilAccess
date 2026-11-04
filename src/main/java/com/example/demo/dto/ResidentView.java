package com.example.demo.dto;

import java.time.LocalDate;
import java.util.UUID;

public interface ResidentView {
    UUID getId();
    String getResidentId();
    String getFirstName();
    String getLastName();
    String getGender();
    LocalDate getBirthDate();
    String getMobileNumber();
    String getEmail();
    String getAddress();
    String getStatus();
    String getBarangayIndigency();
    String getValidId();
}