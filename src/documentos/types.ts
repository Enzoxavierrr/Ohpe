export type HighlightColor = 'yellow' | 'blue' | 'green' | 'pink' | 'orange';

export const HIGHLIGHT_COLORS: HighlightColor[] = ['yellow', 'blue', 'green', 'pink', 'orange'];

export const HIGHLIGHT_COLOR_LABELS: Record<HighlightColor, string> = {
  yellow: 'Amarelo',
  blue: 'Azul',
  green: 'Verde',
  pink: 'Rosa',
  orange: 'Laranja',
};

export type Highlight = {
  id: string;
  start: number;
  end: number;
  text: string;
  color?: HighlightColor;
  createdAt: string;
};

export type DocumentData = {
  id: string;
  title: string;
  content: string;
  highlights: Highlight[];
  groupId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentGroup = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};
