import { describe, it, expect } from 'vitest';
import {
  isBoardShape,
  isWorkspaceShape,
  migrateBoard,
  makeDefaultWorkspace,
} from './useBoard';

describe('isBoardShape', () => {
  it('returns true for object with columns array', () => {
    expect(isBoardShape({ columns: [], cards: {} })).toBe(true);
  });

  it('returns true for object with only cards', () => {
    expect(isBoardShape({ cards: {} })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isBoardShape(null)).toBe(false);
  });

  it('returns false for string', () => {
    expect(isBoardShape('hello')).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isBoardShape({})).toBe(false);
  });
});

describe('isWorkspaceShape', () => {
  it('returns true for valid workspace', () => {
    expect(isWorkspaceShape({ boards: {}, meta: {}, order: [] })).toBe(true);
  });

  it('returns false for a board shape', () => {
    expect(isWorkspaceShape({ columns: [], cards: {} })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isWorkspaceShape(null)).toBe(false);
  });
});

describe('migrateBoard', () => {
  it('handles a valid board', () => {
    const input = {
      columns: [
        { id: 'c1', title: 'A fazer', cardIds: ['card-1'], status: 'todo' },
        { id: 'c2', title: 'Feito', cardIds: [], status: 'done' },
      ],
      cards: {
        'card-1': { id: 'card-1', title: 'Test card', createdAt: '2024-01-01' },
      },
      archive: [],
    };

    const result = migrateBoard(input);
    expect(result.columns).toHaveLength(2);
    expect(result.columns[0].id).toBe('c1');
    expect(result.columns[0].status).toBe('todo');
    expect(result.cards['card-1'].title).toBe('Test card');
    expect(result.archive).toEqual([]);
  });

  it('guesses status from column title when missing', () => {
    const input = {
      columns: [
        { id: 'c1', title: 'A fazer', cardIds: [] },
        { id: 'c2', title: 'Em andamento', cardIds: [] },
        { id: 'c3', title: 'Feito', cardIds: [] },
        { id: 'c4', title: 'Bloqueado', cardIds: [] },
        { id: 'c5', title: 'Melhorias', cardIds: [] },
      ],
      cards: {},
      archive: [],
    };

    const result = migrateBoard(input);
    expect(result.columns[0].status).toBe('todo');
    expect(result.columns[1].status).toBe('doing');
    expect(result.columns[2].status).toBe('done');
    expect(result.columns[3].status).toBe('blocked');
    expect(result.columns[4].status).toBe('improvements');
  });

  it('creates default columns when none provided', () => {
    const result = migrateBoard({ columns: [], cards: {}, archive: [] });
    expect(result.columns.length).toBeGreaterThanOrEqual(3);
  });

  it('handles completely empty input', () => {
    const result = migrateBoard({});
    expect(result.columns.length).toBeGreaterThanOrEqual(3);
    expect(result.cards).toEqual({});
    expect(result.archive).toEqual([]);
  });

  it('coerces cardIds to strings', () => {
    const input = {
      columns: [{ id: 'c1', title: 'Col', cardIds: [1, 2] }],
      cards: {},
      archive: [],
    };

    const result = migrateBoard(input);
    expect(result.columns[0].cardIds).toEqual(['1', '2']);
  });

  it('preserves width when present', () => {
    const input = {
      columns: [{ id: 'c1', title: 'Col', cardIds: [], width: 400 }],
      cards: {},
      archive: [],
    };

    const result = migrateBoard(input);
    expect(result.columns[0].width).toBe(400);
  });
});

describe('makeDefaultWorkspace', () => {
  it('creates a workspace with one board', () => {
    const ws = makeDefaultWorkspace();
    expect(ws.order).toHaveLength(1);
    const id = ws.order[0];
    expect(ws.boards[id]).toBeDefined();
    expect(ws.boards[id].columns).toHaveLength(3);
    expect(ws.meta[id].name).toBe('Meu primeiro board');
  });

  it('accepts a custom name', () => {
    const ws = makeDefaultWorkspace('Projeto X');
    const id = ws.order[0];
    expect(ws.meta[id].name).toBe('Projeto X');
  });
});
