import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLayoutTemplate, lucideSearch, lucideShieldCheck } from '@ng-icons/lucide';

import { FORM_TEMPLATE_CATALOG, FormTemplateCategory, FormTemplateId } from '../../core/templates';
import { FormWorkspaceService } from '../../core/workspace/form-workspace.service';
import { AppShellComponent } from '../../shared/app-shell/app-shell.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { TemplateCardComponent } from '../../shared/template-card/template-card.component';

type CategoryFilter = 'All' | FormTemplateCategory;

@Component({
  selector: 'app-templates-page',
  imports: [AppShellComponent, EmptyStateComponent, NgIcon, TemplateCardComponent],
  providers: [provideIcons({ lucideLayoutTemplate, lucideSearch, lucideShieldCheck })],
  templateUrl: './templates.page.html',
  styleUrl: './templates.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplatesPage {
  private readonly router = inject(Router);
  private readonly workspace = inject(FormWorkspaceService);

  readonly query = signal('');
  readonly category = signal<CategoryFilter>('All');
  readonly categories: readonly CategoryFilter[] = [
    'All',
    'Onboarding',
    'Support',
    'Feedback',
    'Developer',
  ];
  readonly templates = computed(() => {
    const query = this.query().trim().toLowerCase();
    const category = this.category();
    return FORM_TEMPLATE_CATALOG.filter(
      (template) =>
        (category === 'All' || template.category === category) &&
        (!query ||
          `${template.title} ${template.description} ${template.tags.join(' ')}`
            .toLowerCase()
            .includes(query)),
    );
  });

  useTemplate(id: FormTemplateId): void {
    const document = this.workspace.createFromTemplate(id);
    void this.router.navigate(['/builder', document.id]);
  }

  updateQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
}
