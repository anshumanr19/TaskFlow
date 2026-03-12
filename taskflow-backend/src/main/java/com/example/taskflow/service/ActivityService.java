package com.example.taskflow.service;

import com.example.taskflow.domain.ActivityLog;
import com.example.taskflow.domain.User;

import java.util.List;

public interface ActivityService {
    List<ActivityLog> findRecent(User currentUser, int limit);

    void clearFor(User currentUser);
}
