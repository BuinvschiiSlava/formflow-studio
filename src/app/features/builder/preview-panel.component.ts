import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';
import { FormlyFieldConfig, FormlyForm } from '@ngx-formly/core';

import { FormDocument, isDisplayField } from '../../domain/form-document/form-document.model';
import { mapDocumentToFormlyFields } from '../../domain/form-document/formly.mapper';

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';
type SubmissionState = 'idle' | 'invalid' | 'success';

function createDefaultModel(document: FormDocument): Record<string, unknown> {
  return document.fields.reduce<Record<string, unknown>>((model, field) => {
    if (!isDisplayField(field) && field.key && field.defaultValue !== undefined) {
      model[field.key] = structuredClone(field.defaultValue);
    }
    return model;
  }, {});
}

@Component({
  selector: 'app-preview-panel',
  imports: [CdkTrapFocus, FormlyForm, ReactiveFormsModule],
  templateUrl: './preview-panel.component.html',
  styleUrl: './preview-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewPanelComponent {
  readonly document = input.required<FormDocument>();
  readonly closed = output<void>();

  readonly device = signal<PreviewDevice>('desktop');
  readonly form = signal(new UntypedFormGroup({}));
  readonly fields = signal<FormlyFieldConfig[]>([]);
  readonly model = signal<Record<string, unknown>>({});
  readonly modelSnapshot = signal<Record<string, unknown>>({});
  readonly submissionState = signal<SubmissionState>('idle');

  @ViewChild('dialog') private dialog?: ElementRef<HTMLElement>;

  private readonly documentSync = effect(() => {
    const document = this.document();
    untracked(() => this.resetFromDocument(document));
  });

  get modelJson(): string {
    return JSON.stringify(this.modelSnapshot(), null, 2);
  }

  setDevice(device: PreviewDevice): void {
    this.device.set(device);
  }

  reset(): void {
    this.resetFromDocument(this.document());
  }

  onModelChange(value: unknown): void {
    const model = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
    this.model.set(model);
    this.modelSnapshot.set(structuredClone(model));
    this.submissionState.set('idle');
    requestAnimationFrame(() => this.syncValidityAttributes());
  }

  submit(): void {
    const form = this.form();
    form.markAllAsTouched();
    form.updateValueAndValidity();

    if (form.invalid) {
      this.submissionState.set('invalid');
      requestAnimationFrame(() => {
        this.syncValidityAttributes();
        this.focusFirstInvalidControl();
      });
      return;
    }

    this.modelSnapshot.set(structuredClone(this.model()));
    this.submissionState.set('success');
  }

  close(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    event.preventDefault();
    this.close();
  }

  private resetFromDocument(document: FormDocument): void {
    const model = createDefaultModel(document);
    this.form.set(new UntypedFormGroup({}));
    this.fields.set(mapDocumentToFormlyFields(document));
    this.model.set(model);
    this.modelSnapshot.set(structuredClone(model));
    this.submissionState.set('idle');
  }

  private focusFirstInvalidControl(): void {
    const invalidControl = this.dialog?.nativeElement.querySelector<HTMLElement>(
      'input.ng-invalid, textarea.ng-invalid, select.ng-invalid, .mat-mdc-select.ng-invalid, [aria-invalid="true"]',
    );
    invalidControl?.focus();
  }

  private syncValidityAttributes(): void {
    const controls = this.dialog?.nativeElement.querySelectorAll<HTMLElement>(
      'input, textarea, select, .mat-mdc-select',
    );
    controls?.forEach((control) => {
      if (control.classList.contains('ng-invalid') && control.classList.contains('ng-touched')) {
        control.setAttribute('aria-invalid', 'true');
      } else {
        control.removeAttribute('aria-invalid');
      }
    });
  }
}
