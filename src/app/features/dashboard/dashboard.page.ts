import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideClock3,
  lucideCopy,
  lucideFileText,
  lucideMoreHorizontal,
  lucidePlus,
  lucideSparkles,
  lucideTrash2,
  lucideUpload,
} from '@ng-icons/lucide';

import { createJsonExport } from '../../core/export/form-document-export';
import { FormTemplateId, FORM_TEMPLATE_CATALOG } from '../../core/templates';
import { FormWorkspaceService } from '../../core/workspace/form-workspace.service';
import { FormDocument } from '../../domain/form-document/form-document.model';
import { AppShellComponent } from '../../shared/app-shell/app-shell.component';
import { downloadTextFile, readTextFile } from '../../shared/browser-file';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { TemplateCardComponent } from '../../shared/template-card/template-card.component';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    AppShellComponent,
    DatePipe,
    EmptyStateComponent,
    NgIcon,
    RouterLink,
    TemplateCardComponent,
  ],
  providers: [
    provideIcons({
      lucideArrowRight,
      lucideClock3,
      lucideCopy,
      lucideFileText,
      lucideMoreHorizontal,
      lucidePlus,
      lucideSparkles,
      lucideTrash2,
      lucideUpload,
    }),
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly router = inject(Router);
  readonly workspace = inject(FormWorkspaceService);
  readonly templates = FORM_TEMPLATE_CATALOG.slice(0, 4);
  readonly importError = signal('');
  readonly busyImport = signal(false);

  @ViewChild('importInput') private importInput?: ElementRef<HTMLInputElement>;

  createBlank(): void {
    const document = this.workspace.create();
    void this.router.navigate(['/builder', document.id]);
  }

  useTemplate(id: FormTemplateId): void {
    const document = this.workspace.createFromTemplate(id);
    void this.router.navigate(['/builder', document.id]);
  }

  duplicate(document: FormDocument): void {
    this.workspace.duplicate(document);
  }

  remove(document: FormDocument): void {
    if (confirm(`Delete “${document.title}”? This cannot be undone.`)) {
      this.workspace.remove(document.id);
    }
  }

  export(document: FormDocument): void {
    downloadTextFile(createJsonExport(document));
  }

  openImportPicker(): void {
    this.importInput?.nativeElement.click();
  }

  async importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.importError.set('');
    this.busyImport.set(true);
    try {
      const result = this.workspace.importJson(await readTextFile(file));
      if (!result.ok) {
        const first = result.issues[0];
        this.importError.set(`${first?.path ?? '$'}: ${first?.message ?? 'Import failed.'}`);
        return;
      }
      await this.router.navigate(['/builder', result.document.id]);
    } catch {
      this.importError.set('The file could not be read. Please choose a UTF-8 JSON export.');
    } finally {
      this.busyImport.set(false);
    }
  }
}
