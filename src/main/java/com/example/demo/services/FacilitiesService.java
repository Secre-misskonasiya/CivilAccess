package com.example.demo.services;

import com.example.demo.model.Facilities;
import com.example.demo.repository.FacilitiesRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class FacilitiesService {

    @Autowired
    private FacilitiesRepository repository;

    public List<Facilities> getAllFacilities() {
        return repository.findAll();
    }

    public Facilities getFacilityById(Long id) {
        return repository.findById(id).orElse(null);
    }

    public List<Facilities> getByFacilityType(String type) {
        return repository.findByFacilityType(type);
    }
    
    public Facilities saveFacility(Facilities facility) {
        return repository.save(facility);
    }
    
    public void deleteFacility(Long id) {
        repository.deleteById(id);
    }
}