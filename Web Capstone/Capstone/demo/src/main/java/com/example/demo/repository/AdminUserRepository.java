package com.example.demo.repository;

import com.example.demo.dto.AdminUserDTO;
import com.example.demo.model.AdminUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AdminUserRepository extends JpaRepository<AdminUser, Long> {
    
    
   @Query("SELECT MAX(CAST(SUBSTRING(a.employeeId, 6) AS int)) " +
           "FROM AdminUser a WHERE a.employeeId LIKE :yearPrefix%")
    Integer findMaxSequenceForYear(@Param("yearPrefix") String yearPrefix); 
    
    Optional<AdminUser> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);

    @Query("SELECT a.email FROM AdminUser a")
    List<String> findAllEmails();

    // Fetch only usernames
    @Query("SELECT a.username FROM AdminUser a")
    List<String> findAllUsernames();

    // Fetch only phone numbers
    @Query("SELECT a.phoneNumber FROM AdminUser a")
    List<String> findAllPhoneNumbers();

    @Query("SELECT new com.example.demo.dto.AdminUserDTO(" +
       "a.id, a.username, a.employeeId, a.firstName, a.lastName, a.gender, " +
       "a.birthDate, a.phoneNumber, a.role, a.empstatus, a.email, a.address) " +
       "FROM AdminUser a")
List<AdminUserDTO> findAllAdminsOptimized();
    
}
