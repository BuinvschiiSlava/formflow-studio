import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBlocks, lucideGitFork, lucideLayoutTemplate } from '@ng-icons/lucide';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, NgIcon],
  providers: [provideIcons({ lucideBlocks, lucideGitFork, lucideLayoutTemplate })],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  readonly compact = input(false);
}
