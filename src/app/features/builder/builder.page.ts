import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDropList,
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideAlignLeft,
  lucideArrowLeft,
  lucideCalendarDays,
  lucideCheckCircle2,
  lucideChevronDown,
  lucideChevronUp,
  lucideCircleDot,
  lucideCode2,
  lucideCopy,
  lucideDownload,
  lucideEye,
  lucideFileJson,
  lucideGripVertical,
  lucideHash,
  lucideHeading2,
  lucideInfo,
  lucideLayoutPanelTop,
  lucideListFilter,
  lucideMail,
  lucideMinus,
  lucidePanelLeft,
  lucidePanelRight,
  lucidePanelsTopLeft,
  lucidePlus,
  lucideRedo2,
  lucideSave,
  lucideSettings2,
  lucideSquareCheck,
  lucideToggleLeft,
  lucideTrash2,
  lucideType,
  lucideUndo2,
  lucideUpload,
  lucideX,
} from '@ng-icons/lucide';

import { createJsonExport, createTypeScriptExport } from '../../core/export/form-document-export';
import { FormWorkspaceService } from '../../core/workspace/form-workspace.service';
import {
  ConditionOperator,
  FieldCondition,
  FieldValidation,
  FormDocument,
  FormFieldNode,
  FormFieldType,
  isDisplayField,
} from '../../domain/form-document/form-document.model';
import { downloadTextFile, readTextFile } from '../../shared/browser-file';
import { BuilderStore } from './builder.store';
import { PreviewPanelComponent } from './preview-panel.component';

interface PaletteItem {
  readonly type: FormFieldType;
  readonly label: string;
  readonly icon: string;
}

type InspectorTab = 'content' | 'validation' | 'logic';
type MobilePanel = 'fields' | 'canvas' | 'properties';
type ExportTab = 'json' | 'typescript';

@Component({
  selector: 'app-builder-page',
  imports: [
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
    CdkDropList,
    NgIcon,
    PreviewPanelComponent,
    RouterLink,
  ],
  providers: [
    BuilderStore,
    provideIcons({
      lucideAlertCircle,
      lucideAlignLeft,
      lucideArrowLeft,
      lucideCalendarDays,
      lucideCheckCircle2,
      lucideChevronDown,
      lucideChevronUp,
      lucideCircleDot,
      lucideCode2,
      lucideCopy,
      lucideDownload,
      lucideEye,
      lucideFileJson,
      lucideGripVertical,
      lucideHash,
      lucideHeading2,
      lucideInfo,
      lucideLayoutPanelTop,
      lucideListFilter,
      lucideMail,
      lucideMinus,
      lucidePanelLeft,
      lucidePanelRight,
      lucidePanelsTopLeft,
      lucidePlus,
      lucideRedo2,
      lucideSave,
      lucideSettings2,
      lucideSquareCheck,
      lucideToggleLeft,
      lucideTrash2,
      lucideType,
      lucideUndo2,
      lucideUpload,
      lucideX,
    }),
  ],
  templateUrl: './builder.page.html',
  styleUrl: './builder.page.scss',
  host: { '(window:keydown)': 'closeOverlays($event)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuilderPage implements OnDestroy {
  readonly store = inject(BuilderStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workspace = inject(FormWorkspaceService);

  readonly document = this.store.document;
  readonly selectedField = this.store.selectedField;
  readonly previewOpen = signal(false);
  readonly exportOpen = signal(false);
  readonly exportTab = signal<ExportTab>('json');
  readonly inspectorTab = signal<InspectorTab>('content');
  readonly mobilePanel = signal<MobilePanel>('canvas');
  readonly importError = signal('');
  readonly copied = signal(false);

  readonly exportContent = computed(() => {
    const document = this.document();
    if (!document) return '';
    return this.exportTab() === 'json'
      ? createJsonExport(document).content
      : createTypeScriptExport(document).content;
  });

  readonly basicFields: readonly PaletteItem[] = [
    { type: 'text', label: 'Short text', icon: 'lucideType' },
    { type: 'email', label: 'Email', icon: 'lucideMail' },
    { type: 'number', label: 'Number', icon: 'lucideHash' },
    { type: 'textarea', label: 'Long text', icon: 'lucideAlignLeft' },
    { type: 'date', label: 'Date', icon: 'lucideCalendarDays' },
  ];
  readonly choiceFields: readonly PaletteItem[] = [
    { type: 'select', label: 'Dropdown', icon: 'lucideListFilter' },
    { type: 'radio', label: 'Radio group', icon: 'lucideCircleDot' },
    { type: 'checkbox', label: 'Checkbox', icon: 'lucideSquareCheck' },
    { type: 'toggle', label: 'Toggle', icon: 'lucideToggleLeft' },
  ];
  readonly layoutFields: readonly PaletteItem[] = [
    { type: 'heading', label: 'Heading', icon: 'lucideHeading2' },
    { type: 'section', label: 'Section', icon: 'lucidePanelsTopLeft' },
    { type: 'divider', label: 'Divider', icon: 'lucideMinus' },
  ];
  readonly operators: readonly { value: ConditionOperator; label: string }[] = [
    { value: 'equals', label: 'equals' },
    { value: 'notEquals', label: 'does not equal' },
    { value: 'contains', label: 'contains' },
    { value: 'isEmpty', label: 'is empty' },
    { value: 'isNotEmpty', label: 'is not empty' },
    { value: 'greaterThan', label: 'is greater than' },
    { value: 'lessThan', label: 'is less than' },
  ];

  @ViewChild('importInput') private importInput?: ElementRef<HTMLInputElement>;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = params.get('id');
      if (!id || !this.store.load(id)) void this.router.navigate(['/']);
    });
  }

  ngOnDestroy(): void {
    this.store.saveNow();
  }

  addField(type: FormFieldType): void {
    this.store.addField(type);
    this.mobilePanel.set('properties');
  }

  drop(event: CdkDragDrop<FormFieldNode[]>): void {
    this.store.reorderField(event.previousIndex, event.currentIndex);
  }

  selectField(id: string): void {
    this.store.selectField(id);
    if (matchMedia('(max-width: 900px)').matches) this.mobilePanel.set('properties');
  }

  updateDocument(property: 'title' | 'description' | 'submitLabel' | 'locale', event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)
      .value;
    this.store.updateDocument({ [property]: value } as Partial<FormDocument>);
  }

  updateFieldText(
    field: FormFieldNode,
    property: 'label' | 'key' | 'description' | 'placeholder',
    event: Event,
  ): void {
    this.store.updateField(field.id, {
      [property]: (event.target as HTMLInputElement | HTMLTextAreaElement).value,
    });
  }

  updateFieldWidth(field: FormFieldNode, event: Event): void {
    this.store.updateField(field.id, {
      width: (event.target as HTMLSelectElement).value as FormFieldNode['width'],
    });
  }

  updateDefaultValue(field: FormFieldNode, event: Event): void {
    const input = event.target as HTMLInputElement;
    let value: string | number | boolean | undefined;
    if (field.type === 'checkbox' || field.type === 'toggle') value = input.checked;
    else if (field.type === 'number') value = input.value === '' ? undefined : Number(input.value);
    else value = input.value || undefined;
    this.store.updateField(field.id, { defaultValue: value });
  }

  updateValidation(field: FormFieldNode, property: keyof FieldValidation, event: Event): void {
    const input = event.target as HTMLInputElement;
    let value: string | number | boolean | undefined;
    if (input.type === 'checkbox') value = input.checked;
    else if (input.type === 'number') value = input.value === '' ? undefined : Number(input.value);
    else value = input.value || undefined;
    this.store.updateField(field.id, {
      validation: { ...field.validation, [property]: value },
    });
  }

  updateOption(fieldId: string, optionId: string, property: 'label' | 'value', event: Event): void {
    this.store.updateOption(fieldId, optionId, {
      [property]: (event.target as HTMLInputElement).value,
    });
  }

  availableConditionSources(field: FormFieldNode): FormFieldNode[] {
    const fields = this.document()?.fields ?? [];
    const index = fields.findIndex((candidate) => candidate.id === field.id);
    return fields.slice(0, index).filter((candidate) => !isDisplayField(candidate));
  }

  toggleCondition(field: FormFieldNode, enabled: boolean): void {
    if (!enabled) {
      this.store.setCondition(field.id, undefined);
      return;
    }
    const source = this.availableConditionSources(field)[0];
    if (!source) return;
    this.store.setCondition(field.id, {
      action: 'show',
      sourceFieldId: source.id,
      operator: 'equals',
      value: this.defaultConditionValue(source),
    });
  }

  updateCondition(field: FormFieldNode, property: keyof FieldCondition, event: Event): void {
    if (!field.condition) return;
    const raw = (event.target as HTMLInputElement | HTMLSelectElement).value;
    let value: string | number | boolean = raw;
    if (property === 'value') {
      const source = this.document()?.fields.find(
        (candidate) => candidate.id === field.condition?.sourceFieldId,
      );
      if (source?.type === 'number') value = raw === '' ? 0 : Number(raw);
      if (source?.type === 'checkbox' || source?.type === 'toggle') value = raw === 'true';
    }
    this.store.setCondition(field.id, { ...field.condition, [property]: value });
  }

  changeConditionSource(field: FormFieldNode, event: Event): void {
    if (!field.condition) return;
    const sourceFieldId = (event.target as HTMLSelectElement).value;
    const source = this.document()?.fields.find((candidate) => candidate.id === sourceFieldId);
    this.store.setCondition(field.id, {
      ...field.condition,
      sourceFieldId,
      value: source ? this.defaultConditionValue(source) : '',
    });
  }

  conditionNeedsValue(operator: ConditionOperator): boolean {
    return operator !== 'isEmpty' && operator !== 'isNotEmpty';
  }

  conditionSource(field: FormFieldNode): FormFieldNode | undefined {
    return this.document()?.fields.find(
      (candidate) => candidate.id === field.condition?.sourceFieldId,
    );
  }

  isDisplay(field: FormFieldNode): boolean {
    return isDisplayField(field);
  }

  isChoice(field: FormFieldNode): boolean {
    return field.type === 'select' || field.type === 'radio';
  }

  hasTextValidation(field: FormFieldNode): boolean {
    return ['text', 'email', 'textarea'].includes(field.type);
  }

  hasNumericValidation(field: FormFieldNode): boolean {
    return field.type === 'number';
  }

  fieldIcon(type: FormFieldType): string {
    return (
      [...this.basicFields, ...this.choiceFields, ...this.layoutFields].find(
        (item) => item.type === type,
      )?.icon ?? 'lucideType'
    );
  }

  fieldTypeLabel(type: FormFieldType): string {
    return (
      [...this.basicFields, ...this.choiceFields, ...this.layoutFields].find(
        (item) => item.type === type,
      )?.label ?? type
    );
  }

  openImport(): void {
    this.importError.set('');
    this.importInput?.nativeElement.click();
  }

  async importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const result = this.workspace.importJson(await readTextFile(file));
      if (!result.ok) {
        const first = result.issues[0];
        this.importError.set(`${first?.path ?? '$'}: ${first?.message ?? 'Import failed.'}`);
        return;
      }
      await this.router.navigate(['/builder', result.document.id]);
    } catch {
      this.importError.set('The file could not be read. Please choose a FormFlow JSON export.');
    }
  }

  downloadExport(): void {
    const document = this.document();
    if (!document) return;
    downloadTextFile(
      this.exportTab() === 'json' ? createJsonExport(document) : createTypeScriptExport(document),
    );
  }

  async copyExport(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.exportContent());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1600);
    } catch {
      this.copied.set(false);
    }
  }

  closeOverlays(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    this.previewOpen.set(false);
    this.exportOpen.set(false);
  }

  private defaultConditionValue(source: FormFieldNode): string | number | boolean {
    if (source.type === 'number') return 0;
    if (source.type === 'checkbox' || source.type === 'toggle') return true;
    return source.options[0]?.value ?? '';
  }
}
