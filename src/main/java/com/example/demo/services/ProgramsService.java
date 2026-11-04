package com.example.demo.services;

import com.example.demo.model.Programs;
import com.example.demo.repository.ProgramsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ProgramsService {

    @Autowired
    private ProgramsRepository repository;

    public List<Programs> getAllPrograms() {
        return repository.findAll();
    }

    public Programs getProgramById(Long id) {
        return repository.findById(id).orElse(null);
    }

}