package com.example.demo.config;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AsyncConfig {

    // Bounded to 10 — matches the number of independent dashboard queries,
    // so all of them can run concurrently on a single request without
    // spilling into a second batch, but a pathological number of
    // simultaneous dashboard loads still won't flood the DB pool.
    @Bean(destroyMethod = "shutdown")
    public ExecutorService dashboardQueryExecutor() {
        return Executors.newFixedThreadPool(10);
    }
}