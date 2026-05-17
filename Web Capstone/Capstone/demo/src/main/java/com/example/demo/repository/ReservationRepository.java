package com.example.demo.repository;

import com.example.demo.model.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    List<Reservation> findByStatusOrderByDateDescCreatedAtDesc(String status);

    @Query("SELECT COUNT(r) > 0 FROM Reservation r WHERE r.court = :court AND r.date = :date AND r.timeSlot = :timeSlot AND r.status NOT IN ('ARCHIVED', 'RESOLVED') AND r.id != :excludeId")
    boolean existsConflict(@Param("court") String court, @Param("date") LocalDate date, 
                           @Param("timeSlot") String timeSlot, @Param("excludeId") Long excludeId);

    default boolean existsConflict(String court, LocalDate date, String timeSlot) {
        return existsConflict(court, date, timeSlot, -1L);
    }

    List<Reservation> findByFullNameContainingIgnoreCaseOrCourtContainingIgnoreCase(String name, String court);
}