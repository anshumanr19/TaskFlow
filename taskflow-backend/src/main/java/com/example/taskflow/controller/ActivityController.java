package com.example.taskflow.controller;

import com.example.taskflow.domain.ActivityLog;
import com.example.taskflow.domain.User;
import com.example.taskflow.dto.ActivityLogResponse;
import com.example.taskflow.security.UserPrincipal;
import com.example.taskflow.service.ActivityService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/activity")
public class ActivityController {
    private final ActivityService activityService;

    public ActivityController(ActivityService activityService) {
        this.activityService = activityService;
    }

    private User currentUser() {
        return ((UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getUser();
    }

    @GetMapping
    public ResponseEntity<List<ActivityLogResponse>> listRecent() {
        User currentUser = currentUser();
        List<ActivityLogResponse> result = activityService.findRecent(currentUser, 20).stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(result);
    }

    @DeleteMapping
    public ResponseEntity<Void> clearAll() {
        User currentUser = currentUser();
        activityService.clearFor(currentUser);
        return ResponseEntity.noContent().build();
    }

    private ActivityLogResponse toResponse(ActivityLog log) {
        return new ActivityLogResponse(
                log.getId(),
                log.getTask() != null ? log.getTask().getId() : null,
                log.getActor().getId(),
                log.getActor().getFullName(),
                log.getActionCode(),
                log.getMessage(),
                log.getCreatedAt()
        );
    }
}
