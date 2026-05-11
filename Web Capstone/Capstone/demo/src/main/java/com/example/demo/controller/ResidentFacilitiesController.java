package com.example.demo.controller;

import com.example.demo.model.Facilities;
import com.example.demo.repository.FacilitiesRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.List;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/resident/facilities")
public class ResidentFacilitiesController {

    @Autowired
    private FacilitiesRepository facilitiesRepository;

    @GetMapping
    public String residentFacilities(Model model, 
                                      @RequestParam(value = "tab", defaultValue = "police") String tab) {
        
        List<Facilities> allFacilities = facilitiesRepository.findAll();
        
        List<Facilities> policeFacilities = allFacilities.stream()
                .filter(f -> "POLICE".equalsIgnoreCase(f.getFacilityType()))
                .collect(Collectors.toList());
        
        List<Facilities> fireFacilities = allFacilities.stream()
                .filter(f -> "FIRE".equalsIgnoreCase(f.getFacilityType()))
                .collect(Collectors.toList());
        
        List<Facilities> hospitalFacilities = allFacilities.stream()
                .filter(f -> "HOSPITAL".equalsIgnoreCase(f.getFacilityType()))
                .collect(Collectors.toList());
        
        List<Facilities> emergencyFacilities = allFacilities.stream()
                .filter(f -> "EMERGENCY".equalsIgnoreCase(f.getFacilityType()))
                .collect(Collectors.toList());
        
        model.addAttribute("policeFacilities", policeFacilities);
        model.addAttribute("fireFacilities", fireFacilities);
        model.addAttribute("hospitalFacilities", hospitalFacilities);
        model.addAttribute("emergencyFacilities", emergencyFacilities);
        model.addAttribute("currentTab", tab);
        
        return "ResidentFacilities";
    }

    @GetMapping("/{id}")
    @ResponseBody
    public Facilities getFacilityById(@PathVariable Long id) {
        return facilitiesRepository.findById(id).orElse(null);
    }

    @GetMapping("/api/poll")
    @ResponseBody
    public List<Facilities> pollFacilities() {
        return facilitiesRepository.findAll();
    }
}