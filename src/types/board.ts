export type ColumnStatus = 'todo' | 'doing' | 'done' | 'blocked' | 'improvements';

export type CardData = {
  id: string;
  title: string;
  createdAt: string;
  description?: string;
  resolution?: string;
  impediment?: string;
  improvements?: string;
  archivedAt?: string;
  status?: ColumnStatus;
};

export type Column = {
  id: string;
  title: string;
  cardIds: string[];
  status?: ColumnStatus;
  width?: number;
};

export type Board = {
  columns: Column[];
  cards: Record<string, CardData>;
  archive: string[];
};
