import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  LucideDynamicIcon,
  LucideCirclePlus,
  LucideDatabase,
  LucideFileText,
  LucideArrowRight,
  LucideLoader,
  LucideCheckCircle2,
  LucideAlertCircle,
  LucideClock,
  LucideCpu,
} from '@lucide/angular';
import { DashboardService } from '../core/services/dashboard.service';
import type { DashboardData } from '../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  imports: [LucideDynamicIcon, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);

  protected readonly LucideCirclePlus = LucideCirclePlus;
  protected readonly LucideFileText = LucideFileText;
  protected readonly LucideArrowRight = LucideArrowRight;
  protected readonly LucideDatabase = LucideDatabase;
  protected readonly LucideLoader = LucideLoader;
  protected readonly LucideCheckCircle2 = LucideCheckCircle2;
  protected readonly LucideAlertCircle = LucideAlertCircle;
  protected readonly LucideClock = LucideClock;
  protected readonly LucideCpu = LucideCpu;

  protected readonly loading = signal(true);
  protected readonly data = signal<DashboardData | null>(null);

  ngOnInit(): void {
    this.dashboardService.getDashboard().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected openCollection(id: number): void {
    this.router.navigate(['/collections', id]);
  }

  protected formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  protected statusIcon(status: string) {
    if (status === 'indexed') return this.LucideCheckCircle2;
    if (status === 'error') return this.LucideAlertCircle;
    return this.LucideClock;
  }

  protected statusClass(status: string): string {
    if (status === 'indexed') return 'text-tertiary-fixed-dim';
    if (status === 'error') return 'text-error';
    return 'text-on-surface-variant';
  }
}

