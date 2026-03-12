package com.example.taskflow.service.impl;

import com.example.taskflow.domain.ActivityLog;
import com.example.taskflow.domain.User;
import com.example.taskflow.repository.ActivityLogRepository;
import com.example.taskflow.service.ActivityService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
public class ActivityServiceImpl implements ActivityService {
    private final ActivityLogRepository activityLogs;

    public ActivityServiceImpl(ActivityLogRepository activityLogs) {
        this.activityLogs = activityLogs;
    }

    @Override
    public List<ActivityLog> findRecent(User currentUser, int limit) {
        int safeLimit = limit <= 0 ? 20 : Math.min(limit, 100);
        ZoneId zone = ZoneId.systemDefault();
        Instant startOfToday = LocalDate.now(zone)
                .atStartOfDay(zone)
                .toInstant();
        return activityLogs.findRecentForUser(
                currentUser.getId(),
                startOfToday,
                PageRequest.of(0, safeLimit)
        );
    }

    @Override
    @Transactional
    public void clearFor(User currentUser) {
        activityLogs.deleteAllForUser(currentUser.getId());
    }
}
