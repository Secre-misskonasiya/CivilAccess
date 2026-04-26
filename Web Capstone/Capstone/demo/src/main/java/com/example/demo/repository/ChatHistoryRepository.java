package com.example.demo.repository;

import com.example.demo.model.ChatHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ChatHistoryRepository extends JpaRepository<ChatHistory, Long> {
    List<ChatHistory> findByUsernameOrderByCreatedAtAsc(String username);
    void deleteByUsername(String username);
}