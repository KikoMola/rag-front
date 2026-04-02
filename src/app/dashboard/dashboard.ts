import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  LucideDynamicIcon,
  LucideCirclePlus,
  LucideFlaskConical,
  LucideBookOpen,
  LucideSparkles,
  LucideDatabase,
  LucideFileText,
  LucideArrowRight,
  LucideUpload,
  LucideMessageCircle,
  LucideTrendingUp,
} from '@lucide/angular';
import type { LucideIconInput } from '@lucide/angular';

interface StatCard {
  label: string;
  value: string;
  suffix: string;
  suffixClass: string;
}

interface CollectionCard {
  title: string;
  description: string;
  icon: LucideIconInput;
  documents: number;
  updatedAt: string;
  featured: boolean;
  status?: string;
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
  imports: [LucideDynamicIcon],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  protected readonly LucideCirclePlus = LucideCirclePlus;
  protected readonly LucideFileText = LucideFileText;
  protected readonly LucideArrowRight = LucideArrowRight;
  protected readonly LucideTrendingUp = LucideTrendingUp;
  protected readonly LucideDatabase = LucideDatabase;

  protected readonly stats = signal<StatCard[]>([
    { label: 'Total Documents', value: '1,248', suffix: '+12%', suffixClass: 'text-tertiary-fixed-dim font-bold text-sm' },
    { label: 'Total Collections', value: '14', suffix: 'Active', suffixClass: 'text-on-surface-variant text-sm' },
    { label: 'Models Configured', value: '3', suffix: 'OPTIMIZED', suffixClass: 'bg-tertiary-fixed-dim/20 text-on-tertiary-fixed px-2 py-0.5 rounded-full text-[10px] font-bold' },
  ]);

  protected readonly collections = signal<CollectionCard[]>([
    {
      title: 'Investigación Cuántica 2024',
      description: 'Análisis detallado de papers sobre computación cuántica y entrelazamiento de datos a gran escala.',
      icon: LucideFlaskConical,
      documents: 42,
      updatedAt: 'Actualizado ayer',
      featured: false,
    },
    {
      title: 'Manuscritos de Filosofía',
      description: 'Colección privada de textos filosóficos del siglo XVII con anotaciones automáticas de IA.',
      icon: LucideBookOpen,
      documents: 128,
      updatedAt: 'Hace 3 horas',
      featured: false,
    },
    {
      title: 'Prompt Engineering Masterclass',
      description: 'Repositorio de técnicas y mejores prácticas para el desarrollo de agentes inteligentes locales.',
      icon: LucideSparkles,
      documents: 15,
      updatedAt: 'Hace 1 semana',
      featured: false,
    },
    {
      title: 'Global Market Data',
      description: 'Análisis en tiempo real de tendencias de mercado procesadas por Llama 3.',
      icon: LucideDatabase,
      documents: 856,
      updatedAt: '',
      featured: true,
      status: 'Live Syncing',
    },
  ]);

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
}
