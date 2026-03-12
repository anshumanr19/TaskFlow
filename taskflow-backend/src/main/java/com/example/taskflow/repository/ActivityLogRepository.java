package com.example.taskflow.repository;

import com.example.taskflow.domain.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Pageable;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    @Query("""
        select a
        from ActivityLog a
        left join a.task t
        where (
            t.owner.id = :userId
            or t.assignedTo.id = :userId
            or (a.task is null and a.actor.id = :userId)
        )
        and a.actor is not null
        and a.createdAt >= :since
        order by a.createdAt desc
    """)
    List<ActivityLog> findRecentForUser(@Param("userId") Long userId,
                                        @Param("since") Instant since,
                                        Pageable pageable);

    @Modifying
    @Query("update ActivityLog a set a.task = null where a.task.id = :taskId")
    int detachTask(@Param("taskId") Long taskId);

    @Modifying
    @Query("""
        delete from ActivityLog a
        where (
            (a.task is not null and (a.task.owner.id = :userId or a.task.assignedTo.id = :userId))
            or (a.task is null and a.actor.id = :userId)
        )
    """)
    int deleteAllForUser(@Param("userId") Long userId);
}
