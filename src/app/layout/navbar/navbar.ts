import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  LucideSearch,
  LucideCircleHelp,
  LucideBell,
  LucideDynamicIcon,
} from '@lucide/angular';
import { NgpAvatar, NgpAvatarFallback } from 'ng-primitives/avatar';

@Component({
  selector: 'app-navbar',
  imports: [LucideDynamicIcon, NgpAvatar, NgpAvatarFallback],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
  protected readonly LucideSearch = LucideSearch;
  protected readonly LucideCircleHelp = LucideCircleHelp;
  protected readonly LucideBell = LucideBell;

  protected readonly searchQuery = signal('');
}
