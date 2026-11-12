import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideDynamicIcon, LucideMenu } from '@lucide/angular';
import { NgpDialog, NgpDialogOverlay, NgpDialogTitle, NgpDialogTrigger } from 'ng-primitives/dialog';
import { AppButton } from '../shared/ui/button';
import { Sidebar } from './sidebar/sidebar';

@Component({
    selector: 'app-layout',
    imports: [
        RouterOutlet,
        Sidebar,
        LucideDynamicIcon,
        AppButton,
        NgpDialog,
        NgpDialogOverlay,
        NgpDialogTitle,
        NgpDialogTrigger,
    ],
    templateUrl: './layout.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Layout {
    protected readonly LucideMenu = LucideMenu;
}
