package com.example.demo.repository;

import com.example.demo.model.Announcements;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AnnouncementsRepository extends JpaRepository<Announcements, Long> {
    Optional<Announcements> findTopByOrderByDatePostedDesc();
    Optional<Announcements> findTopByStatusNotIgnoreCaseOrderByDatePostedDesc(String status);
}