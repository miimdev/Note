/**
 * Tiny diff helpers for the version history panel.
 *
 * Line-level LCS is enough for note snapshots: documents are usually a few
 * hundred lines, and an O(n*m) table stays small. Words are compared with the
 * same Persian normalisation used by search, so `ي` and `ی` do not show up as
 * a change.
 */

import { normalizeFa } from './search-query';

export type DiffOp = 'equal' | 'added' | 'removed';

export type DiffLine = {
  op: DiffOp;
  text: string;
};

export type WordSegment = {
  op: DiffOp;
  text: string;
};

/** Splits text into lines, ignoring a single trailing newline. */
export function splitLines(text: string): string[] {
  const trimmed = text.replace(/\r\n/g, '\n').replace(/\n$/, '');
  return trimmed.length === 0 ? [] : trimmed.split('\n');
}

/** Longest-common-subsequence table for two arrays of comparable keys. */
function lcsTable(a: string[], b: string[]): number[][] {
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => 0),
  );

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i]![j] =
        a[i] === b[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }

  return table;
}

/**
 * Line diff between `before` and `after`.
 * Removed lines are emitted before added lines so the result reads like a
 * unified diff without the `+`/`-` prefixes.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = splitLines(before);
  const b = splitLines(after);
  const table = lcsTable(a.map(normalizeFa), b.map(normalizeFa));

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (normalizeFa(a[i]!) === normalizeFa(b[j]!)) {
      result.push({ op: 'equal', text: b[j]! });
      i += 1;
      j += 1;
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) {
      result.push({ op: 'removed', text: a[i]! });
      i += 1;
    } else {
      result.push({ op: 'added', text: b[j]! });
      j += 1;
    }
  }

  while (i < a.length) {
    result.push({ op: 'removed', text: a[i]! });
    i += 1;
  }
  while (j < b.length) {
    result.push({ op: 'added', text: b[j]! });
    j += 1;
  }

  return result;
}

/** Word-level diff of two lines, used to highlight what changed inside a line. */
export function diffWords(
  before: string,
  after: string,
): { before: WordSegment[]; after: WordSegment[] } {
  const a = before.split(/(\s+)/).filter((part) => part.length > 0);
  const b = after.split(/(\s+)/).filter((part) => part.length > 0);
  const table = lcsTable(a.map(normalizeFa), b.map(normalizeFa));

  const left: WordSegment[] = [];
  const right: WordSegment[] = [];
  let i = 0;
  let j = 0;

  const push = (list: WordSegment[], op: DiffOp, text: string) => {
    const last = list[list.length - 1];
    if (last && last.op === op) last.text += text;
    else list.push({ op, text });
  };

  while (i < a.length && j < b.length) {
    if (normalizeFa(a[i]!) === normalizeFa(b[j]!)) {
      push(left, 'equal', a[i]!);
      push(right, 'equal', b[j]!);
      i += 1;
      j += 1;
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) {
      push(left, 'removed', a[i]!);
      i += 1;
    } else {
      push(right, 'added', b[j]!);
      j += 1;
    }
  }

  while (i < a.length) {
    push(left, 'removed', a[i]!);
    i += 1;
  }
  while (j < b.length) {
    push(right, 'added', b[j]!);
    j += 1;
  }

  return { before: left, after: right };
}

export type DiffStats = { added: number; removed: number };

export function countChanges(lines: DiffLine[]): DiffStats {
  return lines.reduce<DiffStats>(
    (acc, line) => {
      if (line.op === 'added') acc.added += 1;
      if (line.op === 'removed') acc.removed += 1;
      return acc;
    },
    { added: 0, removed: 0 },
  );
}
