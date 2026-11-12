/**
 * Pure helpers for note history header buttons (undo/redo of doc edits).
 */

export function isHistoryActionEnabled(
  readonly: boolean,
  canPerform: boolean
): boolean {
  return !readonly && canPerform;
}
