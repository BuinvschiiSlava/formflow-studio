import { ZodIssue } from 'zod';

import { FormDocument, ImportIssue, ImportResult } from './form-document.model';
import { FORM_DOCUMENT_LIMITS, formDocumentSchema } from './form-document.schema';
import { validateFormDocumentSemantics } from './form-document.validation';

function formatPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((result, segment) => {
    if (typeof segment === 'number') return `${result}[${segment}]`;
    if (typeof segment === 'symbol') return result;
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment)
      ? `${result}.${segment}`
      : `${result}[${JSON.stringify(segment)}]`;
  }, '$');
}

function zodIssueToImportIssue(issue: ZodIssue): ImportIssue {
  return {
    path: formatPath(issue.path),
    message: issue.message,
  };
}

/** Validates an already parsed, untrusted value without coercion or unknown-key stripping. */
export function parseFormDocument(input: unknown): ImportResult {
  const result = formDocumentSchema.safeParse(input);
  if (!result.success) {
    return {
      ok: false,
      issues: result.error.issues.map(zodIssueToImportIssue),
    };
  }

  const document = result.data as FormDocument;
  const semanticIssues = validateFormDocumentSemantics(document);
  if (semanticIssues.length > 0) return { ok: false, issues: semanticIssues };

  return { ok: true, document: structuredClone(document) };
}

/** Parses a bounded JSON document and reports user-facing, path-specific failures. */
export function importFormDocumentJson(json: string): ImportResult {
  const byteLength = new TextEncoder().encode(json).byteLength;
  if (byteLength > FORM_DOCUMENT_LIMITS.maxImportBytes) {
    return {
      ok: false,
      issues: [
        {
          path: '$',
          message: `File exceeds the ${FORM_DOCUMENT_LIMITS.maxImportBytes} byte import limit`,
        },
      ],
    };
  }

  let value: unknown;
  try {
    value = JSON.parse(json) as unknown;
  } catch {
    return {
      ok: false,
      issues: [{ path: '$', message: 'File is not valid JSON' }],
    };
  }

  return parseFormDocument(value);
}
