import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from './sidebar/sidebar';

@Component({
    selector: 'app-layout',
    imports: [RouterOutlet, Sidebar],
    templateUrl: './layout.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Layout {}
