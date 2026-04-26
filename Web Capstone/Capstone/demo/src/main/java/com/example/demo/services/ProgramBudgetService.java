package com.example.demo.services;

import com.example.demo.model.ProgramBudget;
import com.example.demo.repository.ProgramBudgetRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ProgramBudgetService {

    @Autowired
    private ProgramBudgetRepository repository;

    @Autowired
    private ObjectMapper objectMapper;

    public ProgramBudget saveBudgetItem(String jsonPart, Long programId) throws Exception {
        ProgramBudget budget = objectMapper.readValue(jsonPart, ProgramBudget.class);
        budget.setProgramId(programId);
        return repository.save(budget);
    }

    public ProgramBudget saveManualEntry(ProgramBudget budget) {
        if (budget.getBudgetItem() == null || budget.getBudgetItem().isEmpty()) {
            budget.setBudgetItem("Manual Budget Update");
        }
        return repository.save(budget);
    }

    public ProgramBudget updateFirstEntry(Double newAmount) {
        List<ProgramBudget> all = repository.findAll();
        if (all.isEmpty()) {
           
            ProgramBudget entry = new ProgramBudget();
            entry.setBudgetItem("Manual Budget Update");
            entry.setAmount(newAmount);
            entry.setProgramId(1L);
            return repository.save(entry);
        }

        ProgramBudget first = all.get(0);
        first.setAmount(newAmount);
        return repository.save(first);
    }

    public Double getTotalBudget() {
        return repository.getTotalBudget();
    }

    public List<ProgramBudget> getAllBudgets() {
        return repository.findAll();
    }

    public List<ProgramBudget> getBudgetsByProgram(Long programId) {
        return repository.findByProgramId(programId);
    }

    public void deleteBudget(Long id) {
        repository.deleteById(id);
    }
}