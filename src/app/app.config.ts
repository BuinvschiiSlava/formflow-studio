import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { FormlyFieldConfig, provideFormlyCore } from '@ngx-formly/core';
import { withFormlyMaterial } from '@ngx-formly/material';
import { routes } from './app.routes';
import { FormLocale } from './domain/form-document/form-document.model';
import { DividerFieldType } from './shared/formly-types/divider-field.type';
import { HeadingFieldType } from './shared/formly-types/heading-field.type';
import { ToggleFieldType } from './shared/formly-types/toggle-field.type';

const VALIDATION_MESSAGES = {
  en: {
    required: 'This field is required.',
    minLength: 'The value is too short.',
    maxLength: 'The value is too long.',
    min: 'The value is below the minimum.',
    max: 'The value is above the maximum.',
    pattern: 'The value has an invalid format.',
  },
  ru: {
    required: 'Это поле обязательно.',
    minLength: 'Значение слишком короткое.',
    maxLength: 'Значение слишком длинное.',
    min: 'Значение меньше допустимого минимума.',
    max: 'Значение больше допустимого максимума.',
    pattern: 'Значение имеет неверный формат.',
  },
} as const satisfies Record<FormLocale, Record<string, string>>;

type ValidationMessageName = keyof (typeof VALIDATION_MESSAGES)['en'];

export function formflowValidationMessage(name: ValidationMessageName) {
  return (_error: unknown, field: FormlyFieldConfig): string => {
    const locale: FormLocale = field.props?.['formflowLocale'] === 'ru' ? 'ru' : 'en';
    return VALIDATION_MESSAGES[locale][name];
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes, withHashLocation()),
    provideFormlyCore([
      ...withFormlyMaterial(),
      {
        types: [
          { name: 'heading', component: HeadingFieldType },
          { name: 'section', component: HeadingFieldType },
          { name: 'divider', component: DividerFieldType },
          { name: 'toggle', component: ToggleFieldType },
        ],
        validationMessages: [
          { name: 'required', message: formflowValidationMessage('required') },
          { name: 'minLength', message: formflowValidationMessage('minLength') },
          { name: 'maxLength', message: formflowValidationMessage('maxLength') },
          { name: 'min', message: formflowValidationMessage('min') },
          { name: 'max', message: formflowValidationMessage('max') },
          { name: 'pattern', message: formflowValidationMessage('pattern') },
        ],
      },
    ]),
  ],
};
