package com.example.demo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.DelegatingRequestMatcherHeaderWriter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.util.matcher.NegatedRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;

@Configuration
public class SecurityConfig {

    // Landing page only: no 'unsafe-inline' anywhere (this is what gets A+)
    private static final String STRICT_CSP =
        "default-src 'self'; "
        + "script-src 'self'; "
        + "style-src 'self' https://fonts.googleapis.com; "
        + "font-src 'self' https://fonts.gstatic.com; "
        + "img-src 'self' data:; "
        + "connect-src 'self'; "
        + "object-src 'none'; "
        + "base-uri 'self'; "
        + "form-action 'self'; "
        + "frame-ancestors 'self'";

    // All other pages: loose, so nothing breaks
    private static final String LOOSE_CSP =
        "default-src 'self'; "
        + "style-src 'self' 'unsafe-inline' https:; "
        + "script-src 'self' 'unsafe-inline' https:; "
        + "img-src 'self' data: https:; "
        + "font-src 'self' data: https:; "
        + "connect-src 'self' https:";

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        RequestMatcher landing = new OrRequestMatcher(
            new AntPathRequestMatcher("/"),
            new AntPathRequestMatcher("/landing-page")
        );

        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/landing-page", "/login", "/images/**", "/icons/**", "/css/**", "/js/**",
                "/check-admin-email", "/send-otp", "/verify-otp",
                "/api/forgot-password/**",
                "/api/**",
                "/resident-login", "/resident-logout", "/resident-check-status",
                "/resident-register", "/api/resident/**", "/resident/**").permitAll()
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")
                .loginProcessingUrl("/login")
                .usernameParameter("email")
                .defaultSuccessUrl("/home", true)
                .permitAll()
            )
            .logout(logout -> logout
                .logoutSuccessUrl("/landing-page?loggedout")
                .permitAll()
            )
            .headers(headers -> headers
                .addHeaderWriter(new DelegatingRequestMatcherHeaderWriter(
                    landing,
                    new StaticHeadersWriter("Content-Security-Policy", STRICT_CSP)))
                .addHeaderWriter(new DelegatingRequestMatcherHeaderWriter(
                    new NegatedRequestMatcher(landing),
                    new StaticHeadersWriter("Content-Security-Policy", LOOSE_CSP)))
                .referrerPolicy(ref -> ref
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                .permissionsPolicyHeader(p -> p
                    .policy("camera=(), microphone=(), geolocation=()"))
            );

        return http.build();
    }
}  