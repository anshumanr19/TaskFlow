import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../services/task.service';
import { ActivityLogResponse, TaskRequest, TaskResponse, TaskStatus } from '../../models/task.model';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { TaskFormComponent } from '../task-form/task-form.component';
import { AuthService } from '../../services/auth.service';
import { AnalyticsPanelComponent } from './analytics-panel/analytics-panel.component';
import { TaskSummaryResponse } from '../../models/task.model';
import { ActivityFeedComponent } from '../activity-feed/activity-feed.component';

type Tab = 'ALL' | TaskStatus | 'ASSIGNED';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, NavbarComponent, TaskFormComponent, AnalyticsPanelComponent, ActivityFeedComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  #tasks = inject(TaskService);
  #auth = inject(AuthService);

  tasks: TaskResponse[] = [];
  filteredTasks: TaskResponse[] = [];

  statusKeys: TaskStatus[] = ['ALL_TASK','TODO','IN_PROGRESS','DONE'];
  tab: Tab = 'ALL';
  sortByPriority = false;
  alertVisible = true;

  // Precomputed counts for stats
  counts: Record<TaskStatus, number> = { ALL_TASK : 0 ,TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  overdueCount = 0;
  dueTodayCount = 0;

  showAnalytics = false;
  analyticsLoaded = false;
  analyticsLoading = false;
  analyticsError = '';
  analyticsSummary: TaskSummaryResponse | null = null;
  activityEntries: ActivityLogResponse[] = [];
  activityLoading = false;
  activityError = '';

  // Modal state
  showForm = false;
  selected: TaskResponse | null = null;
  isSaving = false;

  ngOnInit(): void {
    this.reload();
    this.loadActivity();
  }

  // ------- Data Loading -------
  reload(): void {
    this.#tasks.list().subscribe((res) => {
      this.tasks = res;
      this.recomputeCounts();
      this.computeAlerts();
      this.applyFilter();
    });
  }

  // ------- Derived State -------
  private recomputeCounts(): void {
    const c: Record<TaskStatus, number> = { ALL_TASK : this.tasks.length ,TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    for (const t of this.tasks) c[t.status] = (c[t.status] ?? 0) + 1;
    this.counts = c;
  }

  private computeAlerts(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let overdue = 0;
    let dueToday = 0;
    for (const task of this.tasks) {
      if (task.status === 'DONE') continue;
      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);
      if (due < today) overdue++;
      if (due.getTime() === today.getTime()) dueToday++;
    }
    this.overdueCount = overdue;
    this.dueTodayCount = dueToday;
    this.alertVisible = overdue > 0 || dueToday > 0;
  }

  private applyFilter(): void {
    let filtered: TaskResponse[];

    if (this.tab === 'ASSIGNED') {
      const currentUserId = this.#auth.getCurrentUserId();
      filtered = this.tasks.filter(t => t.assignedToId === currentUserId);
    } else if (this.tab === 'ALL') {
      filtered = this.tasks.slice();
    } else {
      filtered = this.tasks.filter(t => t.status === this.tab);
    }

    if (this.sortByPriority) {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      const statusOrder = { TODO: 0, IN_PROGRESS: 1, DONE: 2 };
      filtered.sort((a, b) => {
        const statusDiff =
          (statusOrder[a.status as keyof typeof statusOrder] ?? 99) -
          (statusOrder[b.status as keyof typeof statusOrder] ?? 99);
        if (statusDiff !== 0) return statusDiff;
        return (
          (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 99) -
          (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 99)
        );
      });
    }

    this.filteredTasks = filtered;
  }

  // ------- UI Actions -------
  setTab(next: Tab): void {
    if (this.tab === next) return;
    this.tab = next;
    this.applyFilter();
  }

  toggleSortPriority(): void {
    this.sortByPriority = !this.sortByPriority;
    this.applyFilter();
  }

  toggleAnalytics(): void {
    this.showAnalytics = !this.showAnalytics;
    if (this.showAnalytics && !this.analyticsLoaded && !this.analyticsLoading) {
      this.loadAnalytics();
    }
  }

  hideAnalytics(): void {
    this.showAnalytics = false;
  }

  private loadAnalytics(): void {
    this.analyticsLoading = true;
    this.analyticsError = '';
    this.#tasks.summary().subscribe({
      next: (summary) => {
        this.analyticsSummary = summary;
        this.analyticsLoaded = true;
        this.analyticsLoading = false;
      },
      error: (err) => {
        this.analyticsError = err?.error?.message || 'Failed to load analytics.';
        this.analyticsLoading = false;
      }
    });
  }

  loadActivity(): void {
    this.activityLoading = true;
    this.activityError = '';
    this.#tasks.activity().subscribe({
      next: (entries) => {
        this.activityEntries = entries;
        this.activityLoading = false;
      },
      error: (err) => {
        this.activityError = err?.error?.message || 'Failed to load activity.';
        this.activityLoading = false;
      }
    });
  }

  onClearActivity(): void {
    this.activityLoading = true;
    this.activityError = '';
    this.#tasks.clearActivity().subscribe({
      next: () => {
        this.activityEntries = [];
        this.activityLoading = false;
      },
      error: (err) => {
        this.activityError = err?.error?.message || 'Failed to clear activity.';
        this.activityLoading = false;
      }
    });
  }

  dismissAlert(): void {
    this.alertVisible = false;
  }

  openCreate(): void { this.selected = null; this.showForm = true; }
  openEdit(t: TaskResponse): void { this.selected = t; this.showForm = true; }
  closeForm(): void { this.showForm = false; this.selected = null; }

  // ------- Save from modal -------
  onSaved(data: TaskRequest): void {
    if (this.isSaving) return;
    this.isSaving = true;
    if (this.selected) {
      const id = this.selected.id;
      this.#tasks.update(id, data).subscribe({
        next: (saved) => {
          this.tasks = this.tasks.map(t => t.id === id ? saved : t);
          this.recomputeCounts();
          this.computeAlerts();
          this.applyFilter();
          this.loadActivity();
          this.isSaving = false;
          this.closeForm();
        },
        error: () => { this.isSaving = false; }
      });
    } else {
      this.#tasks.create(data).subscribe({
        next: (saved) => {
          this.tasks = [saved, ...this.tasks];
          this.recomputeCounts();
          this.computeAlerts();
          this.applyFilter();
          this.loadActivity();
          this.isSaving = false;
          this.closeForm();
        },
        error: () => { this.isSaving = false; }
      });
    }
  }

  // ------- Delete -------
  confirmDelete(t: TaskResponse): void {
    if (confirm('Are you sure you want to delete this task?')) {
      this.#tasks.remove(t.id).subscribe({
        next: () => {
          this.tasks = this.tasks.filter(x => x.id !== t.id);
          this.recomputeCounts();
          this.computeAlerts();
          this.applyFilter();
          this.loadActivity();
        },
        error: (err) => {
          alert(err?.error?.message ?? 'Failed to delete task.');
        }
      });
    }
  }

  deleteFromEditModal(): void {
    if (!this.selected) return;
    const task = this.selected;
    if (confirm('Are you sure you want to delete this task?')) {
      this.#tasks.remove(task.id).subscribe({
        next: () => {
          this.tasks = this.tasks.filter(x => x.id !== task.id);
          this.recomputeCounts();
          this.computeAlerts();
          this.applyFilter();
          this.loadActivity();
          this.closeForm();
        },
        error: (err) => {
          alert(err?.error?.message ?? 'Failed to delete task.');
        }
      });
    }
  }

  // ------- View helpers -------
  trackById(_i: number, t: TaskResponse): number { return t.id; }

  label(s: string): string {
    switch (s) {
  case 'ALL_TASK': return 'All Tasks';
  case 'IN_PROGRESS': return 'In Progress';
  case 'DONE': return 'Done';
  default: return 'To-Do';
}
    // You can also switch/signalify this later for localization
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'HIGH': return 'badge--high';
      case 'MEDIUM': return 'badge--med';
      case 'LOW': return 'badge--low';
      default: return '';
    }
  }

  getDueState(dueDate: string, status: TaskStatus): 'overdue' | 'today' | 'done' | 'upcoming' {
    if (status === 'DONE') return 'done';
    const due = new Date(dueDate);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (due < today) return 'overdue';
    if (due.getTime() === today.getTime()) return 'today';
    return 'upcoming';
  }
}
