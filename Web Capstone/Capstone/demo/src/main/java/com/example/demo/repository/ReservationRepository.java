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

    List<Reservation> findByStatusOrderByCreatedAtDesc(String status);

    @Query("SELECT COUNT(r) > 0 FROM Reservation r " +
           "WHERE r.court = :court AND r.date = :date " +
           "AND r.timeFrom = :timeFrom AND r.timeTo = :timeTo " +
           "AND r.status NOT IN ('ARCHIVED', 'RESOLVED') AND r.id != :excludeId")
    boolean existsConflict(@Param("court") String court,
                           @Param("date") LocalDate date,
                           @Param("timeFrom") String timeFrom,
                           @Param("timeTo") String timeTo,
                           @Param("excludeId") Long excludeId);

    default boolean existsConflict(String court, LocalDate date, String timeFrom, String timeTo) {
        return existsConflict(court, date, timeFrom, timeTo, -1L);
    }

    List<Reservation> findByFullNameContainingIgnoreCaseOrCourtContainingIgnoreCase(String name, String court);
}