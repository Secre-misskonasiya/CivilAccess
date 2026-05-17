package com.example.demo.config; // ← adjust if needed

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

import java.io.IOException;

@Configuration
@EnableWebSecurity
public class ResidentSecurityConfig {

    // ─────────────────────────────────────────────────────────
    // Spring Security chain — keeps Spring out of resident routes
    // ─────────────────────────────────────────────────────────
    @Bean
    @Order(1)
    public SecurityFilterChain residentSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher(
                "/resident-login",
                "/resident-logout",
                "/resident-check-status",
                "/resident-register",
                "/api/resident/**",
             
                "/resident-home/**",
                "/resident-profile/**"
            )
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            .formLogin(form -> form.disable())
            .logout(logout -> logout.disable())
            .httpBasic(basic -> basic.disable())
            .csrf(csrf -> csrf.ignoringRequestMatchers(
                "/resident-login",
                "/resident-check-status",
                "/api/resident/**"
            ));

        return http.build();
    }

    // ─────────────────────────────────────────────────────────
    // Session guard filter — replaces the interceptor + WebMvcConfigurer
    //
    // Protects resident pages that require a logged-in session.
    // Registered as a plain servlet Filter so no WebMvcConfigurer needed.
    // ─────────────────────────────────────────────────────────
    @Bean
    public FilterRegistrationBean<Filter> residentSessionFilter() {
        FilterRegistrationBean<Filter> registration = new FilterRegistrationBean<>();

        registration.setFilter(new Filter() {
            @Override
            public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
                    throws IOException, ServletException {

                HttpServletRequest  request  = (HttpServletRequest)  req;
                HttpServletResponse response = (HttpServletResponse) res;

                HttpSession session = request.getSession(false);
                boolean loggedIn   = session != null
                        && session.getAttribute("residentId") != null;

                if (!loggedIn) {
                    response.sendRedirect(request.getContextPath() + "/resident-login");
                    return;
                }

                chain.doFilter(req, res);
            }
        });

        // ── Paths that require a resident session ──
        registration.addUrlPatterns(
        
            "/resident-home/*",
            "/resident-profile/*"
            // Add more resident-only routes here as you build them
        );

        registration.setName("residentSessionFilter");
        registration.setOrder(1);
        return registration;
    }
}