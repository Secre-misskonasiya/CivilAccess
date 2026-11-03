package com.example.demo.repository;

import com.example.demo.model.Blotter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BlotterRepository extends JpaRepository<Blotter, Long> {
    
    List<Blotter> findByStatus(String status);

    long countByStatus(String status);
    
    @Query("SELECT b FROM Blotter b WHERE " +
           "LOWER(b.complainantName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(b.respondentName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(b.incidentType) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(b.incidentLocation) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(b.narrative) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Blotter> search(@Param("query") String query);
    
    @Query("SELECT b FROM Blotter b ORDER BY b.createdAt DESC")
    List<Blotter> findAllOrderByCreatedAtDesc();
}