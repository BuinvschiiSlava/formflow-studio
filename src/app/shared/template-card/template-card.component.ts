import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideBraces,
  lucideLifeBuoy,
  lucideMessageSquareHeart,
  lucideUserRoundPlus,
} from '@ng-icons/lucide';

import { FormTemplateMetadata } from '../../core/templates';

@Component({
  selector: 'app-template-card',
  imports: [NgIcon],
  providers: [
    provideIcons({
      lucideArrowRight,
      lucideBraces,
      lucideLifeBuoy,
      lucideMessageSquareHeart,
      lucideUserRoundPlus,
    }),
  ],
  template: `
    <article class="template-card" [attr.data-accent]="template().accent">
      <div class="template-card__topline">
        <span class="template-card__icon" aria-hidden="true">
          <ng-icon [name]="iconName()" />
        </span>
        <span class="template-card__category">{{ template().category }}</span>
      </div>
      <h3>{{ template().title }}</h3>
      <p>{{ template().description }}</p>
      <div class="template-card__tags" aria-label="Template features">
        @for (tag of template().tags.slice(0, 2); track tag) {
          <span>{{ tag }}</span>
        }
      </div>
      <footer>
        <span>{{ template().fieldCount }} fields</span>
        <button type="button" class="template-card__action" (click)="use.emit()">
          Use template
          <ng-icon name="lucideArrowRight" aria-hidden="true" />
        </button>
      </footer>
    </article>
  `,
  styleUrl: './template-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateCardComponent {
  readonly template = input.required<FormTemplateMetadata>();
  readonly use = output<void>();

  iconName(): string {
    return (
      {
        'user-round-plus': 'lucideUserRoundPlus',
        'life-buoy': 'lucideLifeBuoy',
        'message-square-heart': 'lucideMessageSquareHeart',
        braces: 'lucideBraces',
      }[this.template().icon] ?? 'lucideBraces'
    );
  }
}
