import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideDynamicIcon,
  LucideFileText,
  LucideFileType,
  LucideFileCode,
  LucideCloudUpload,
  LucideUpload,
  LucideMessageSquare,
  LucideEye,
  LucideTrash2,
  LucideRefreshCw,
  LucideChevronRight,
  LucideNetwork,
} from '@lucide/angular';
import type { LucideIconInput } from '@lucide/angular';

type DocumentStatus = 'embedded' | 'indexing' | 'pending';

interface CollectionDocument {
  name: string;
  icon: LucideIconInput;
  type: string;
  size: string;
  status: DocumentStatus;
}

interface CollectionMetric {
  label: string;
  value: string;
  highlight?: boolean;
}

interface ActivityEntry {
  text: string;
  detail: string;
  color: 'tertiary' | 'surface-tint';
}

@Component({
  selector: 'app-collections',
  imports: [RouterLink, LucideDynamicIcon],
  templateUrl: './collections.html',
  styleUrl: './collections.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Collections {
  protected readonly LucideFileText = LucideFileText;
  protected readonly LucideFileType = LucideFileType;
  protected readonly LucideFileCode = LucideFileCode;
  protected readonly LucideCloudUpload = LucideCloudUpload;
  protected readonly LucideUpload = LucideUpload;
  protected readonly LucideMessageSquare = LucideMessageSquare;
  protected readonly LucideEye = LucideEye;
  protected readonly LucideTrash2 = LucideTrash2;
  protected readonly LucideRefreshCw = LucideRefreshCw;
  protected readonly LucideChevronRight = LucideChevronRight;
  protected readonly LucideNetwork = LucideNetwork;

  collectionName = signal('Investigación Cuántica 2024');
  totalSize = signal('124.5 MB');
  totalDocuments = signal(18);

  documents = signal<CollectionDocument[]>([
    { name: 'teoria_campos_v2.pdf', icon: LucideFileText, type: 'PDF', size: '4.2 MB', status: 'embedded' },
    { name: 'notas_laboratorio.txt', icon: LucideFileType, type: 'TXT', size: '12 KB', status: 'indexing' },
    { name: 'resumen_ejecutivo.md', icon: LucideFileCode, type: 'MD', size: '45 KB', status: 'pending' },
    { name: 'paper_final_physics.pdf', icon: LucideFileText, type: 'PDF', size: '12.8 MB', status: 'embedded' },
  ]);

  metrics = signal<CollectionMetric[]>([
    { label: 'Vectores Generados', value: '42.8k' },
    { label: 'Calidad de Indexado', value: '98%', highlight: true },
    { label: 'Chunks de Texto', value: '12,402' },
  ]);

  activities = signal<ActivityEntry[]>([
    { text: 'Indexado completado', detail: 'Hace 2 minutos • teoria_campos_v2.pdf', color: 'tertiary' },
    { text: 'Nueva consulta al chat', detail: 'Hace 15 minutos • ¿Qué dice la sección 3?', color: 'surface-tint' },
  ]);
}
