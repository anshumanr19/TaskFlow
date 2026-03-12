import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivityLogResponse } from '../../models/task.model';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [CommonModule, RelativeTimePipe],
  templateUrl: './activity-feed.component.html',
  styleUrls: ['./activity-feed.component.css']
})
export class ActivityFeedComponent {
  @Input() entries: ActivityLogResponse[] = [];
  @Input() loading = false;
  @Input() error = '';
  @Output() refresh = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();

  colorClass(actionCode: string): string {
    switch (actionCode) {
      case 'COMMENT_ADDED': return 'entry--comment';
      case 'TASK_STATUS_CHANGED': return 'entry--status';
      case 'TASK_ASSIGNED': return 'entry--assign';
      case 'TASK_CREATED': return 'entry--created';
      case 'TASK_PRIORITY_CHANGED': return 'entry--priority';
      case 'TASK_DELETED': return 'entry--deleted';
      default: return 'entry--created';
    }
  }

  shortCode(actionCode: string): string {
    switch (actionCode) {
      case 'COMMENT_ADDED': return 'C';
      case 'TASK_STATUS_CHANGED': return 'S';
      case 'TASK_ASSIGNED': return 'A';
      case 'TASK_CREATED': return '+';
      case 'TASK_PRIORITY_CHANGED': return 'P';
      case 'TASK_DELETED': return 'D';
      default: return '*';
    }
  }
}
