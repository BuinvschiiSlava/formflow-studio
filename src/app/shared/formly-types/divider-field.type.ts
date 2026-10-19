import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'app-divider-field-type',
  template: '<hr class="form-divider" />',
  styles: '.form-divider { border: 0; border-top: 1px solid var(--color-border); margin: 1rem 0; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DividerFieldType extends FieldType<FieldTypeConfig> {}
