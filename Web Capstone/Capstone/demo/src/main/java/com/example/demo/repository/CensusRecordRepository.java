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

    // ── Optimised list queries ────────────────────────────────────

    @Query("""
            SELECT new com.example.demo.dto.CensusRecordDTO(
                c.id, c.recordId, c.firstName, c.middleName, c.lastName, c.suffix,
                c.gender, c.dateOfBirth, c.address, c.mobile, c.occupation,
                c.accountStatus, c.censusStatus,
                c.governmentIdUrl, c.selfieWithIdUrl, c.birthCertificate,
                c.householdRelation, c.homeOwnership, c.evacuationPriority,
                c.isSeniorCitizen, c.isPwd, c.isSoloParent,
                c.isRegisteredVoter, c.is4psBeneficiary,
                c.emergencyContactName, c.emergencyContactNumber
            )
            FROM CensusRecord c
            WHERE c.censusStatus <> 'ARCHIVED'
            ORDER BY c.id DESC
            """)
    List<CensusRecordDTO> findAllActiveOptimized();

    @Query("""
            SELECT new com.example.demo.dto.CensusRecordDTO(
                c.id, c.recordId, c.firstName, c.middleName, c.lastName, c.suffix,
                c.gender, c.dateOfBirth, c.address, c.mobile, c.occupation,
                c.accountStatus, c.censusStatus,
                c.governmentIdUrl, c.selfieWithIdUrl, c.birthCertificate,
                c.householdRelation, c.homeOwnership, c.evacuationPriority,
                c.isSeniorCitizen, c.isPwd, c.isSoloParent,
                c.isRegisteredVoter, c.is4psBeneficiary,
                c.emergencyContactName, c.emergencyContactNumber
            )
            FROM CensusRecord c
            WHERE c.censusStatus = 'ARCHIVED'
            ORDER BY c.id DESC
            """)
    List<CensusRecordDTO> findAllArchivedOptimized();

    @Query("""
            SELECT new com.example.demo.dto.CensusRecordDTO(
                c.id, c.recordId, c.firstName, c.middleName, c.lastName, c.suffix,
                c.gender, c.dateOfBirth, c.address, c.mobile, c.occupation,
                c.accountStatus, c.censusStatus,
                c.governmentIdUrl, c.selfieWithIdUrl, c.birthCertificate,
                c.householdRelation, c.homeOwnership, c.evacuationPriority,
                c.isSeniorCitizen, c.isPwd, c.isSoloParent,
                c.isRegisteredVoter, c.is4psBeneficiary,
                c.emergencyContactName, c.emergencyContactNumber
            )
            FROM CensusRecord c
            WHERE c.censusStatus = :status
            ORDER BY c.id DESC
            """)
    List<CensusRecordDTO> findByStatus(@Param("status") String status);

    // ── Search — returns CensusView projection (no full entity load) ──

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

    // ── Soft archive / restore ────────────────────────────────────

    @Modifying
    @Query("UPDATE CensusRecord c SET c.censusStatus = 'ARCHIVED' WHERE c.id = :id")
    void archiveById(@Param("id") Long id);

    @Modifying
    @Query("UPDATE CensusRecord c SET c.censusStatus = 'PENDING' WHERE c.id = :id")
    void restoreById(@Param("id") Long id);

    // ── Scalar helpers ────────────────────────────────────────────

    @Query("SELECT c.mobile FROM CensusRecord c WHERE c.mobile IS NOT NULL")
    List<String> findAllMobileNumbers();
}