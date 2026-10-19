import { formflowValidationMessage } from './app.config';

describe('localized Formly validation messages', () => {
  it('uses the document locale and falls back to English', () => {
    const required = formflowValidationMessage('required');

    expect(required(undefined, { props: { formflowLocale: 'ru' } })).toBe('Это поле обязательно.');
    expect(required(undefined, { props: { formflowLocale: 'en' } })).toBe(
      'This field is required.',
    );
    expect(required(undefined, {})).toBe('This field is required.');
  });
});
