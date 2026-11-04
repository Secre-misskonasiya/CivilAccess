package com.example.demo.repository;

import com.example.demo.model.Facilities;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FacilitiesRepository extends JpaRepository<Facilities, Long> {
    
    List<Facilities> findByFacilityType(String facilityType);
}