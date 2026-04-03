import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  LucideDynamicIcon,
  LucideCirclePlus,
  LucideSparkles,
  LucideDatabase,
  LucideFileText,
  LucideArrowRight,
  LucideUpload,
  LucideMessageCircle,
  LucideLoader,
} from '@lucide/angular';
import type { LucideIconInput } from '@lucide/angular';
import { CollectionsService } from '../core/services/collections.service';
import type { Collection } from '../core/models/collection.model';

interface StatCard {
  label: string;
  value: string;
  suffix: string;
  suffixClass: string;
}

interface ActivityItem {
  icon: LucideIconInput;
  iconClass: string;
  title: string;
  subtitle: string;
  time: string;
  showConnector: boolean;
}

@Component({
  selector: 'app-dashboard',
  imports: [LucideDynamicIcon, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  private readonly collectionsService = inject(CollectionsService);
  private readonly router = inject(Router);

  protected readonly LucideCirclePlus = LucideCirclePlus;
  protected readonly LucideFileText = LucideFileText;
  protected readonly LucideArrowRight = LucideArrowRight;
  protected readonly LucideDatabase = LucideDatabase;
  protected readonly LucideLoader = LucideLoader;

  protected readonly stats = signal<StatCard[]>([
    { label: 'Total Documents', value: '1,248', suffix: '+12%', suffixClass: 'text-tertiary-fixed-dim font-bold text-sm' },
    { label: 'Total Collections', value: '—', suffix: 'Active', suffixClass: 'text-on-surface-variant text-sm' },
    { label: 'Models Configured', value: '3', suffix: 'OPTIMIZED', suffixClass: 'bg-tertiary-fixed-dim/20 text-on-tertiary-fixed px-2 py-0.5 rounded-full text-[10px] font-bold' },
  ]);

  protected readonly collections = signal<Collection[]>([]);
  protected readonly loading = signal(true);

  protected readonly activities = signal<ActivityItem[]>([
    {
      icon: LucideUpload,
      iconClass: 'text-primary',
      title: 'Subiste 4 documentos',
      subtitle: 'En "Investigación Cuántica"',
      time: 'Hace 10 min',
      showConnector: true,
    },
    {
      icon: LucideSparkles,
      iconClass: 'text-tertiary-fixed-dim',
      title: 'Indexación completada',
      subtitle: 'Colección "Filosofía" lista',
      time: 'Hace 2 horas',
      showConnector: true,
    },
    {
      icon: LucideMessageCircle,
      iconClass: 'text-secondary',
      title: 'Nueva consulta guardada',
      subtitle: 'Sobre "Prompt Engineering"',
      time: 'Ayer',
      showConnector: false,
    },
  ]);

  protected readonly memoryUsed = signal(12.4);
  protected readonly memoryTotal = signal(16);
  protected readonly memoryPercent = signal(75);

  ngOnInit(): void {
    this.collectionsService.getCollections().subscribe({
      next: (data) => {
        this.collections.set(data);
        this.stats.update((s) =>
          s.map((stat) =>
            stat.label === 'Total Collections'
              ? { ...stat, value: String(data.length) }
              : stat
          )
        );
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
}
