package com.example.demo.repository;

import com.example.demo.model.ChatHistoryAI;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ChatHistoryRepositoryAI extends JpaRepository<ChatHistoryAI, Long> {
    List<ChatHistoryAI> findByUsernameOrderByCreatedAtAsc(String username);
    void deleteByUsername(String username);
}