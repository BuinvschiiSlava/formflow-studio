import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFilePlus2, lucideSearchX } from '@ng-icons/lucide';

@Component({
  selector: 'app-empty-state',
  imports: [NgIcon],
  providers: [provideIcons({ lucideFilePlus2, lucideSearchX })],
  template: `
    <section class="empty" [class.empty--compact]="compact()">
      <span class="empty__icon" aria-hidden="true">
        <ng-icon [name]="icon() === 'search' ? 'lucideSearchX' : 'lucideFilePlus2'" />
      </span>
      <h2>{{ title() }}</h2>
      <p>{{ description() }}</p>
      <div class="empty__actions"><ng-content /></div>
    </section>
  `,
  styles: `
    .empty {
      display: grid;
      justify-items: center;
      padding: 54px 24px;
      text-align: center;
    }
    .empty--compact {
      padding: 34px 18px;
    }
    .empty__icon {
      display: grid;
      width: 52px;
      height: 52px;
      place-items: center;
      border-radius: 14px;
      background: var(--color-brand-soft);
      color: var(--color-brand);
    }
    .empty__icon ng-icon {
      width: 24px;
      height: 24px;
    }
    h2 {
      margin: 16px 0 5px;
      font-size: 18px;
    }
    p {
      max-width: 430px;
      margin: 0;
      color: var(--color-text-secondary);
    }
    .empty__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
      margin-top: 20px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly icon = input<'file' | 'search'>('file');
  readonly compact = input(false);
}
