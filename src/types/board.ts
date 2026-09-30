export type CardData = {
  id: string;
  title: string;
  createdAt: string;
};

export type Column = {
  id: string;
  title: string;
  cardIds: string[];
};

export type Board = {
  columns: Column[];
  cards: Record<string, CardData>;
};
