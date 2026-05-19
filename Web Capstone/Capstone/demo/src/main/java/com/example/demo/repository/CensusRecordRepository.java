package com.example.demo.repository;

import com.example.demo.dto.CensusRecordDTO;
import com.example.demo.dto.CensusView;
import com.example.demo.model.CensusRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CensusRecordRepository extends JpaRepository<CensusRecord, Long> {

    boolean existsByMobile(String mobile);

    Optional<CensusRecord> findByRecordId(String recordId);

    @Query("""
            SELECT new com.example.demo.dto.CensusRecordDTO(
                c.id, c.recordId, c.householdId,
                c.firstName, c.middleName, c.lastName, c.suffix,
                c.gender, c.dateOfBirth, c.address, c.mobile, c.occupation,
                c.accountStatus, c.censusStatus,
                c.governmentIdUrl, c.selfieWithIdUrl, c.birthCertificate,
                c.householdRelation, c.homeOwnership, c.evacuationPriority,
                c.isSeniorCitizen, c.isPwd, c.isSoloParent,
                c.isRegisteredVoter, c.is4psBeneficiary,
                c.emergencyContactName, c.emergencyContactNumber,
                c.emergencyContactRelation,
                c.nationality, c.placeOfBirth, c.civilStatus,
                c.religion, c.bloodType, c.idType,
                c.hoaMembership, c.householdMemberCount,
                c.dwellingType, c.householdMemberNames,
                c.educationalAttainment, c.employmentStatus,
                c.monthlyIncomeRange, c.isIndigenousPeople,
                c.precinctNumber, c.medicalHistory,
                c.philhealthId, c.philhealthCategory,
                c.bloodPressureHistory, c.vaccCovid19,
                c.vaccInfluenza, c.vaccHpv,
                c.latitude, c.longitude
            )
            FROM CensusRecord c
            WHERE c.censusStatus <> 'ARCHIVED'
            ORDER BY c.id DESC
            """)
    List<CensusRecordDTO> findAllActiveOptimized();

    @Query("""
          SELECT c FROM CensusRecord c
          WHERE c.censusStatus != 'ARCHIVED'
            AND (c.isSeniorCitizen = true OR c.isPwd = true)
            AND c.latitude IS NOT NULL
            AND c.longitude IS NOT NULL
      """)
    List<CensusRecord> findVerifiedPriorityResidents();

    @Query("""
            SELECT new com.example.demo.dto.CensusRecordDTO(
                c.id, c.recordId, c.householdId,
                c.firstName, c.middleName, c.lastName, c.suffix,
                c.gender, c.dateOfBirth, c.address, c.mobile, c.occupation,
                c.accountStatus, c.censusStatus,
                c.governmentIdUrl, c.selfieWithIdUrl, c.birthCertificate,
                c.householdRelation, c.homeOwnership, c.evacuationPriority,
                c.isSeniorCitizen, c.isPwd, c.isSoloParent,
                c.isRegisteredVoter, c.is4psBeneficiary,
                c.emergencyContactName, c.emergencyContactNumber,
                c.emergencyContactRelation,
                c.nationality, c.placeOfBirth, c.civilStatus,
                c.religion, c.bloodType, c.idType,
                c.hoaMembership, c.householdMemberCount,
                c.dwellingType, c.householdMemberNames,
                c.educationalAttainment, c.employmentStatus,
                c.monthlyIncomeRange, c.isIndigenousPeople,
                c.precinctNumber, c.medicalHistory,
                c.philhealthId, c.philhealthCategory,
                c.bloodPressureHistory, c.vaccCovid19,
                c.vaccInfluenza, c.vaccHpv,
                c.latitude, c.longitude
            )
            FROM CensusRecord c
            WHERE c.censusStatus = 'ARCHIVED'
            ORDER BY c.id DESC
            """)
    List<CensusRecordDTO> findAllArchivedOptimized();

    @Query("SELECT new com.example.demo.dto.CensusRecordDTO(" +
        "c.id, c.recordId, c.householdId, " +
        "c.firstName, c.middleName, c.lastName, c.suffix, " +
        "c.gender, c.dateOfBirth, c.address, c.mobile, c.occupation, " +
        "c.accountStatus, c.censusStatus, " +
        "c.governmentIdUrl, c.selfieWithIdUrl, c.birthCertificate, " +
        "c.householdRelation, c.homeOwnership, c.evacuationPriority, " +
        "c.isSeniorCitizen, c.isPwd, c.isSoloParent, " +
        "c.isRegisteredVoter, c.is4psBeneficiary, " +
        "c.emergencyContactName, c.emergencyContactNumber, " +
        "c.emergencyContactRelation, " +
        "c.nationality, c.placeOfBirth, c.civilStatus, " +
        "c.religion, c.bloodType, c.idType, " +
        "c.hoaMembership, c.householdMemberCount, " +
        "c.dwellingType, c.householdMemberNames, " +
        "c.educationalAttainment, c.employmentStatus, " +
        "c.monthlyIncomeRange, c.isIndigenousPeople, " +
        "c.precinctNumber, c.medicalHistory, " +
        "c.philhealthId, c.philhealthCategory, " +
        "c.bloodPressureHistory, c.vaccCovid19, " +
        "c.vaccInfluenza, c.vaccHpv, " +
        "c.latitude, c.longitude" +
        ") " +
        "FROM CensusRecord c " +
        "WHERE c.householdId = :householdId " +
        "AND c.censusStatus <> 'ARCHIVED' " +
        "ORDER BY " +
        "CASE c.householdRelation " +
        "WHEN 'Head' THEN 1 " +
        "WHEN 'Spouse' THEN 2 " +
        "WHEN 'Child' THEN 3 " +
        "WHEN 'Parent' THEN 4 " +
        "ELSE 5 END, " +
        "c.lastName ASC")
    List<CensusRecordDTO> findByHouseholdId(@Param("householdId") String householdId);

    @Query("SELECT MAX(c.householdId) FROM CensusRecord c WHERE c.householdId LIKE 'HH-%'")
    String findMaxHouseholdId();

    @Query("""
            SELECT c FROM CensusRecord c
            WHERE c.censusStatus <> 'ARCHIVED'
              AND (LOWER(c.firstName) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.lastName)  LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.address)   LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.recordId)  LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY c.id DESC
            """)
    List<CensusView> searchActive(@Param("q") String query);

    @Modifying
    @Query("UPDATE CensusRecord c SET c.censusStatus = 'ARCHIVED' WHERE c.id = :id")
    void archiveById(@Param("id") Long id);

    @Modifying
    @Query("UPDATE CensusRecord c SET c.censusStatus = 'PENDING' WHERE c.id = :id")
    void restoreById(@Param("id") Long id);

    @Query("SELECT c.mobile FROM CensusRecord c WHERE c.mobile IS NOT NULL")
    List<String> findAllMobileNumbers();
}