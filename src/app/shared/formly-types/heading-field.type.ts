import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'app-heading-field-type',
  template: `
    <section class="form-section" [class.form-section--prominent]="field.type === 'section'">
      <h2>{{ props.label }}</h2>
      @if (props.description) {
        <p>{{ props.description }}</p>
      }
    </section>
  `,
  styles: `
    .form-section {
      margin: 1.25rem 0 0.35rem;
    }
    .form-section h2 {
      margin: 0;
      color: var(--color-text);
      font-size: 1.05rem;
      line-height: 1.4;
    }
    .form-section p {
      margin: 0.3rem 0 0;
      color: var(--color-text-secondary);
      font-size: 0.875rem;
    }
    .form-section--prominent {
      padding: 1rem 1.1rem;
      border-radius: 12px;
      background: var(--color-brand-soft);
    }
    .form-section--prominent h2 {
      color: var(--color-brand-strong);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeadingFieldType extends FieldType<FieldTypeConfig> {}
