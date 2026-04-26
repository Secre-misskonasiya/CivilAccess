package com.example.demo.services;

import com.example.demo.model.Requests;
import com.example.demo.repository.RequestsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class RequestsService {

    @Autowired
    private RequestsRepository repository;

    public List<Requests> getAllRequests() {
        return repository.findAll();
    }

    public Requests getRequestById(Long id) {
        return repository.findById(id).orElse(null);
    }

}