package com.example.demo.model;

import jakarta.persistence.*;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "census_records")
public class CensusRecord {

    // ── Primary key ──────────────────────────────────────────────
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)  // Changed from AUTO
    @Column(updatable = false, nullable = false)
    private Long id;

    @Column(name = "record_id", unique = true, updatable = false)
    private String recordId;

    // ── Account / status ─────────────────────────────────────────
    @Column(name = "account_status")
    private String accountStatus = "pending";      // pending | verified | flagged

    @Column(name = "census_status")
    private String censusStatus = "PENDING";       // PENDING | INCOMPLETE | COMPLETE | FLAGGED | ARCHIVED

    // ── Contact ──────────────────────────────────────────────────
    private String mobile;
    private String address;

    // ── Identity details ─────────────────────────────────────────
    @Column(name = "first_name")
    private String firstName;

    @Column(name = "middle_name")
    private String middleName;

    @Column(name = "last_name")
    private String lastName;

    private String suffix;

    @Column(name = "date_of_birth")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate dateOfBirth;

    private String nationality = "Filipino";

    @Column(name = "place_of_birth")
    private String placeOfBirth;

    private String gender;

    @Column(name = "civil_status")
    private String civilStatus;

    private String religion;

    @Column(name = "blood_type")
    private String bloodType;

    // ── Proof of identity ────────────────────────────────────────
    @Column(name = "id_type")
    private String idType;

    @Column(name = "government_id_url")
    private String governmentIdUrl;

    @Column(name = "selfie_with_id_url")
    private String selfieWithIdUrl;

    @Column(name = "birth_certificate")
    private String birthCertificate;

    // ── Household ────────────────────────────────────────────────
    @Column(name = "household_relation")
    private String householdRelation;

    @Column(name = "home_ownership")
    private String homeOwnership;

    @Column(name = "hoa_membership")
    private String hoaMembership;

    @Column(name = "dwelling_type")
    private String dwellingType;

    @Column(name = "household_id")
    private String householdId;

    @Column(name = "household_member_count")
    private Integer householdMemberCount;

    @Column(name = "household_member_names", columnDefinition = "TEXT")
    private String householdMemberNames;

    // ── Socio-economic ───────────────────────────────────────────
    @Column(name = "educational_attainment")
    private String educationalAttainment;

    private String occupation;

    @Column(name = "employment_status")
    private String employmentStatus;

    @Column(name = "monthly_income_range")
    private String monthlyIncomeRange;

    // ── Priority sector (boolean flags) ──────────────────────────
    @Column(name = "is_senior_citizen")
    private boolean isSeniorCitizen = false;

    @Column(name = "is_pwd")
    private boolean isPwd = false;

    @Column(name = "is_solo_parent")
    private boolean isSoloParent = false;

    @Column(name = "is_indigenous_people")
    private boolean isIndigenousPeople = false;

    // ── Civic ────────────────────────────────────────────────────
    @Column(name = "is_registered_voter")
    private boolean isRegisteredVoter = false;

    @Column(name = "is_4ps_beneficiary")
    private boolean is4psBeneficiary = false;

    @Column(name = "precinct_number")
    private String precinctNumber;

    // ── Health ───────────────────────────────────────────────────
    @Column(name = "medical_history", columnDefinition = "TEXT")
    private String medicalHistory;

    @Column(name = "philhealth_id")
    private String philhealthId;

    @Column(name = "philhealth_category")
    private String philhealthCategory;

    @Column(name = "blood_pressure_history")
    private String bloodPressureHistory;

    @Column(name = "evacuation_priority")
    private String evacuationPriority;

    // ── Reproductive health ──────────────────────────────────────
    @Column(name = "last_menstrual_period")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate lastMenstrualPeriod;

    @Column(name = "family_planning_method")
    private String familyPlanningMethod;

    // ── Vaccination ──────────────────────────────────────────────
    @Column(name = "vacc_covid19")
    private String vaccCovid19;

    @Column(name = "vacc_influenza")
    private String vaccInfluenza;

    @Column(name = "vacc_hpv")
    private String vaccHpv;

    // ── Disability (boolean flags) ───────────────────────────────
    @Column(name = "disability_visual")
    private boolean disabilityVisual = false;

    @Column(name = "disability_hearing")
    private boolean disabilityHearing = false;

    @Column(name = "disability_psychosocial")
    private boolean disabilityPsychosocial = false;

    @Column(name = "disability_orthopedic")
    private boolean disabilityOrthopedic = false;

    @Column(name = "disability_intellectual")
    private boolean disabilityIntellectual = false;

    // ── Emergency contact ────────────────────────────────────────
    @Column(name = "emergency_contact_name")
    private String emergencyContactName;

    @Column(name = "emergency_contact_number")
    private String emergencyContactNumber;

    // After: private String emergencyContactNumber;  (around line 195 area)

    @Column(name = "emergency_contact_relation")
    private String emergencyContactRelation;

    // ── Computed helpers ─────────────────────────────────────────

    @Transient
    public String getFullName() {
        String full = ((firstName != null ? firstName : "") + " "
                + (middleName != null ? middleName + " " : "")
                + (lastName != null ? lastName : "")
                + (suffix != null ? " " + suffix : "")).trim();
        return full.isEmpty() ? "Unknown Resident" : full;
    }

    @Transient
    public Integer getAge() {
        if (dateOfBirth == null) return null;
        return java.time.Period.between(dateOfBirth, LocalDate.now()).getYears();
    }

    // ── Getters & Setters ────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRecordId() { return recordId; }
    public void setRecordId(String recordId) { this.recordId = recordId; }

    public String getAccountStatus() { return accountStatus; }
    public void setAccountStatus(String accountStatus) { this.accountStatus = accountStatus; }

    public String getCensusStatus() { return censusStatus; }
    public void setCensusStatus(String censusStatus) { this.censusStatus = censusStatus; }

    public String getMobile() { return mobile; }
    public void setMobile(String mobile) { this.mobile = mobile; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getMiddleName() { return middleName; }
    public void setMiddleName(String middleName) { this.middleName = middleName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getSuffix() { return suffix; }
    public void setSuffix(String suffix) { this.suffix = suffix; }

    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getNationality() { return nationality; }
    public void setNationality(String nationality) { this.nationality = nationality; }

    public String getPlaceOfBirth() { return placeOfBirth; }
    public void setPlaceOfBirth(String placeOfBirth) { this.placeOfBirth = placeOfBirth; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getCivilStatus() { return civilStatus; }
    public void setCivilStatus(String civilStatus) { this.civilStatus = civilStatus; }

    public String getReligion() { return religion; }
    public void setReligion(String religion) { this.religion = religion; }

    public String getBloodType() { return bloodType; }
    public void setBloodType(String bloodType) { this.bloodType = bloodType; }

    public String getIdType() { return idType; }
    public void setIdType(String idType) { this.idType = idType; }

    public String getGovernmentIdUrl() { return governmentIdUrl; }
    public void setGovernmentIdUrl(String governmentIdUrl) { this.governmentIdUrl = governmentIdUrl; }

    public String getSelfieWithIdUrl() { return selfieWithIdUrl; }
    public void setSelfieWithIdUrl(String selfieWithIdUrl) { this.selfieWithIdUrl = selfieWithIdUrl; }

    public String getBirthCertificate() { return birthCertificate; }
    public void setBirthCertificate(String birthCertificate) { this.birthCertificate = birthCertificate; }

    public String getHouseholdId() { return householdId; }
    public void setHouseholdId(String householdId) { this.householdId = householdId; }

    public String getDwellingType() { return dwellingType; }
    public void setDwellingType(String dwellingType) { this.dwellingType = dwellingType; }

    public String getHouseholdRelation() { return householdRelation; }
    public void setHouseholdRelation(String householdRelation) { this.householdRelation = householdRelation; }

    public String getHomeOwnership() { return homeOwnership; }
    public void setHomeOwnership(String homeOwnership) { this.homeOwnership = homeOwnership; }

    public String getHoaMembership() { return hoaMembership; }
    public void setHoaMembership(String hoaMembership) { this.hoaMembership = hoaMembership; }

    public Integer getHouseholdMemberCount() { return householdMemberCount; }
    public void setHouseholdMemberCount(Integer householdMemberCount) { this.householdMemberCount = householdMemberCount; }

    public String getHouseholdMemberNames() { return householdMemberNames; }
    public void setHouseholdMemberNames(String householdMemberNames) { this.householdMemberNames = householdMemberNames; }

    public String getEducationalAttainment() { return educationalAttainment; }
    public void setEducationalAttainment(String educationalAttainment) { this.educationalAttainment = educationalAttainment; }

    public String getOccupation() { return occupation; }
    public void setOccupation(String occupation) { this.occupation = occupation; }

    public String getEmploymentStatus() { return employmentStatus; }
    public void setEmploymentStatus(String employmentStatus) { this.employmentStatus = employmentStatus; }

    public String getMonthlyIncomeRange() { return monthlyIncomeRange; }
    public void setMonthlyIncomeRange(String monthlyIncomeRange) { this.monthlyIncomeRange = monthlyIncomeRange; }

    public boolean isSeniorCitizen() { return isSeniorCitizen; }
    public void setSeniorCitizen(boolean seniorCitizen) { isSeniorCitizen = seniorCitizen; }

    public boolean isPwd() { return isPwd; }
    public void setPwd(boolean pwd) { isPwd = pwd; }

    public boolean isSoloParent() { return isSoloParent; }
    public void setSoloParent(boolean soloParent) { isSoloParent = soloParent; }

    public boolean isIndigenousPeople() { return isIndigenousPeople; }
    public void setIndigenousPeople(boolean indigenousPeople) { isIndigenousPeople = indigenousPeople; }

    public boolean isRegisteredVoter() { return isRegisteredVoter; }
    public void setRegisteredVoter(boolean registeredVoter) { isRegisteredVoter = registeredVoter; }

    public boolean is4psBeneficiary() { return is4psBeneficiary; }
    public void set4psBeneficiary(boolean beneficiary) { is4psBeneficiary = beneficiary; }

    public String getPrecinctNumber() { return precinctNumber; }
    public void setPrecinctNumber(String precinctNumber) { this.precinctNumber = precinctNumber; }

    public String getMedicalHistory() { return medicalHistory; }
    public void setMedicalHistory(String medicalHistory) { this.medicalHistory = medicalHistory; }

    public String getPhilhealthId() { return philhealthId; }
    public void setPhilhealthId(String philhealthId) { this.philhealthId = philhealthId; }

    public String getPhilhealthCategory() { return philhealthCategory; }
    public void setPhilhealthCategory(String philhealthCategory) { this.philhealthCategory = philhealthCategory; }

    public String getBloodPressureHistory() { return bloodPressureHistory; }
    public void setBloodPressureHistory(String bloodPressureHistory) { this.bloodPressureHistory = bloodPressureHistory; }

    public String getEvacuationPriority() { return evacuationPriority; }
    public void setEvacuationPriority(String evacuationPriority) { this.evacuationPriority = evacuationPriority; }

    public LocalDate getLastMenstrualPeriod() { return lastMenstrualPeriod; }
    public void setLastMenstrualPeriod(LocalDate lastMenstrualPeriod) { this.lastMenstrualPeriod = lastMenstrualPeriod; }

    public String getFamilyPlanningMethod() { return familyPlanningMethod; }
    public void setFamilyPlanningMethod(String familyPlanningMethod) { this.familyPlanningMethod = familyPlanningMethod; }

    public String getVaccCovid19() { return vaccCovid19; }
    public void setVaccCovid19(String vaccCovid19) { this.vaccCovid19 = vaccCovid19; }

    public String getVaccInfluenza() { return vaccInfluenza; }
    public void setVaccInfluenza(String vaccInfluenza) { this.vaccInfluenza = vaccInfluenza; }

    public String getVaccHpv() { return vaccHpv; }
    public void setVaccHpv(String vaccHpv) { this.vaccHpv = vaccHpv; }

    public boolean isDisabilityVisual() { return disabilityVisual; }
    public void setDisabilityVisual(boolean disabilityVisual) { this.disabilityVisual = disabilityVisual; }

    public boolean isDisabilityHearing() { return disabilityHearing; }
    public void setDisabilityHearing(boolean disabilityHearing) { this.disabilityHearing = disabilityHearing; }

    public boolean isDisabilityPsychosocial() { return disabilityPsychosocial; }
    public void setDisabilityPsychosocial(boolean disabilityPsychosocial) { this.disabilityPsychosocial = disabilityPsychosocial; }

    public boolean isDisabilityOrthopedic() { return disabilityOrthopedic; }
    public void setDisabilityOrthopedic(boolean disabilityOrthopedic) { this.disabilityOrthopedic = disabilityOrthopedic; }

    public boolean isDisabilityIntellectual() { return disabilityIntellectual; }
    public void setDisabilityIntellectual(boolean disabilityIntellectual) { this.disabilityIntellectual = disabilityIntellectual; }

    public String getEmergencyContactName() { return emergencyContactName; }
    public void setEmergencyContactName(String emergencyContactName) { this.emergencyContactName = emergencyContactName; }

    public String getEmergencyContactNumber() { return emergencyContactNumber; }
    public void setEmergencyContactNumber(String emergencyContactNumber) { this.emergencyContactNumber = emergencyContactNumber; }

    public String getEmergencyContactRelation() { return emergencyContactRelation; }
    public void setEmergencyContactRelation(String emergencyContactRelation) { this.emergencyContactRelation = emergencyContactRelation; }

}