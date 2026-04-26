package com.example.demo.aspect;

import com.example.demo.services.ActivityLogService;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class ActivityLogAspect {

    @Autowired
    private ActivityLogService activityLogService;

    @Autowired
    private HttpServletRequest request;

    @AfterReturning(
        pointcut = "@annotation(logActivity)",
        returning = "result"
    )
    public void logAfterAction(JoinPoint joinPoint, LogActivity logActivity, Object result) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        activityLogService.log(
            auth.getName(),
            auth.getAuthorities().toString(),
            logActivity.action(),
            logActivity.module(),
            logActivity.details(),
            request.getRemoteAddr(),
            "Success"
        );
    }

    @AfterThrowing(
        pointcut = "@annotation(logActivity)",
        throwing = "ex"
    )
    public void logAfterFailure(JoinPoint joinPoint, LogActivity logActivity, Exception ex) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        activityLogService.log(
            auth.getName(),
            auth.getAuthorities().toString(),
            logActivity.action(),
            logActivity.module(),
            "Failed: " + ex.getMessage(),
            request.getRemoteAddr(),
            "Failed"
        );
    }
}