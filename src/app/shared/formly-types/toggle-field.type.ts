import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { FieldType, FieldTypeConfig, FormlyAttributes } from '@ngx-formly/core';

@Component({
  selector: 'app-toggle-field-type',
  imports: [MatSlideToggle, ReactiveFormsModule, FormlyAttributes],
  template: `
    <mat-slide-toggle [formControl]="formControl" [formlyAttributes]="field">
      {{ props.label }}
    </mat-slide-toggle>
    @if (props.description) {
      <p class="toggle-description">{{ props.description }}</p>
    }
  `,
  styles:
    '.toggle-description { margin: .35rem 0 0 3.25rem; color: var(--color-text-secondary); font-size: .8rem; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleFieldType extends FieldType<FieldTypeConfig> {}
