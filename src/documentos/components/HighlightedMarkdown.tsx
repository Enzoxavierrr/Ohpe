import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Highlight, HighlightColor } from '../types';

type Props = {
  content: string;
  highlights: Highlight[];
  activeColor: HighlightColor;
  onAddHighlight: (next: Omit<Highlight, 'id' | 'createdAt'>) => void;
  onHighlightClick?: (id: string) => void;
};

type FloatingSelection = {
  rect: { top: number; left: number };
  start: number;
  end: number;
  text: string;
};

type Resolved = Highlight & { resolvedStart: number; resolvedEnd: number };

function collectTextNodes(root: Node): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      // Pula nós dentro do botão flutuante de grifar, se por acaso estiver no DOM
      const parent = (n as Text).parentElement;
      if (parent && parent.closest('.doc-grifo-btn')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node: Node | null = walker.nextNode();
  while (node) {
    nodes.push(node as Text);
    node = walker.nextNode();
  }
  return nodes;
}

function plaintext(root: Node): { text: string; nodes: Text[]; starts: number[] } {
  const nodes = collectTextNodes(root);
  let text = '';
  const starts: number[] = [];
  for (const n of nodes) {
    starts.push(text.length);
    text += n.data;
  }
  return { text, nodes, starts };
}

function offsetFromDom(nodes: Text[], starts: number[], node: Node, offset: number): number | null {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i] === node) return starts[i] + offset;
  }
  return null;
}

function unwrapAllMarks(root: HTMLElement) {
  const marks = Array.from(root.querySelectorAll('mark[data-highlight-id]'));
  for (const m of marks) {
    const parent = m.parentNode;
    if (!parent) continue;
    while (m.firstChild) parent.insertBefore(m.firstChild, m);
    parent.removeChild(m);
  }
  // Mescla text nodes adjacentes gerados pelo unwrap
  root.normalize();
}

/**
 * Aplica um único grifo [start, end) percorrendo os text nodes:
 * para cada text node que interseciona o intervalo, divide se preciso e envolve
 * o pedaço num <mark>. Isso é robusto quando a seleção cruza <strong>, links,
 * parágrafos, listas, etc. — cada pedaço vira seu próprio mark com o mesmo id.
 */
function applySingleHighlight(root: HTMLElement, h: Resolved) {
  if (h.resolvedStart < 0 || h.resolvedEnd <= h.resolvedStart) return;
  // Re-colhe text nodes a cada iteração; o splitText muda a lista.
  const nodes = collectTextNodes(root);
  let acc = 0;
  for (const node of nodes) {
    const nodeStart = acc;
    const nodeEnd = acc + node.data.length;
    acc = nodeEnd;
    if (nodeEnd <= h.resolvedStart) continue;
    if (nodeStart >= h.resolvedEnd) break;

    const localStart = Math.max(0, h.resolvedStart - nodeStart);
    const localEnd = Math.min(node.data.length, h.resolvedEnd - nodeStart);
    if (localEnd <= localStart) continue;

    const parent = node.parentNode;
    if (!parent) continue;
    // Se já estamos dentro de um mark do mesmo id (não deveria após unwrap), pula
    if ((parent as HTMLElement).matches?.(`mark[data-highlight-id="${h.id}"]`)) continue;

    let middle: Text = node;
    if (localStart > 0) middle = middle.splitText(localStart);
    if (localEnd - localStart < middle.data.length) middle.splitText(localEnd - localStart);

    const mark = document.createElement('mark');
    mark.setAttribute('data-highlight-id', h.id);
    if (h.color) mark.setAttribute('data-color', h.color);
    parent.insertBefore(mark, middle);
    mark.appendChild(middle);
  }
}

/**
 * Tenta localizar [start, end) no plaintext atual. Se a slice não bate com
 * o texto salvo, tenta re-ancorar pelo snippet via indexOf — robusto contra
 * pequenas edições no conteúdo acima.
 */
function resolveHighlight(fullText: string, h: Highlight): Resolved {
  const slice = fullText.slice(h.start, h.end);
  if (slice === h.text) {
    return { ...h, resolvedStart: h.start, resolvedEnd: h.end };
  }
  if (h.text) {
    const found = fullText.indexOf(h.text);
    if (found !== -1) {
      return { ...h, resolvedStart: found, resolvedEnd: found + h.text.length };
    }
  }
  return { ...h, resolvedStart: -1, resolvedEnd: -1 };
}

export function HighlightedMarkdown({
  content,
  highlights,
  activeColor,
  onAddHighlight,
  onHighlightClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<FloatingSelection | null>(null);

  // Re-aplicar marks sempre que o conteúdo ou os highlights mudarem.
  // Toda a lógica roda contra o DOM atualizado dentro do useLayoutEffect.
  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    unwrapAllMarks(root);
    if (highlights.length === 0) return;

    // Resolve offsets contra o DOM atual (depois do unwrap)
    const { text } = plaintext(root);
    const resolved = highlights
      .map((h) => resolveHighlight(text, h))
      .filter((h) => h.resolvedStart >= 0 && h.resolvedEnd > h.resolvedStart)
      // Aplica de trás pra frente pra não invalidar offsets dos próximos
      .sort((a, b) => b.resolvedStart - a.resolvedStart);

    for (const h of resolved) {
      try {
        applySingleHighlight(root, h);
      } catch (err) {
        console.warn('[highlight] falhou pra', h.id, err);
      }
    }
  }, [content, highlights]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const onMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setSelection(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!root.contains(range.commonAncestorContainer)) {
        setSelection(null);
        return;
      }
      // Se a seleção está totalmente dentro de um mark existente, ignora
      const startInMark = (range.startContainer.parentElement as HTMLElement | null)?.closest(
        'mark[data-highlight-id]',
      );
      const endInMark = (range.endContainer.parentElement as HTMLElement | null)?.closest(
        'mark[data-highlight-id]',
      );
      if (startInMark && startInMark === endInMark) {
        setSelection(null);
        return;
      }

      const { text: fullText, nodes, starts } = plaintext(root);
      const a = offsetFromDom(nodes, starts, range.startContainer, range.startOffset);
      const b = offsetFromDom(nodes, starts, range.endContainer, range.endOffset);
      if (a == null || b == null) {
        setSelection(null);
        return;
      }
      const start = Math.min(a, b);
      const end = Math.max(a, b);
      if (end <= start) {
        setSelection(null);
        return;
      }
      // Importante: o text salvo vem do plaintext (sem \n extras do sel.toString),
      // pra que offsets e snippet fiquem consistentes.
      const text = fullText.slice(start, end);
      if (!text.trim()) {
        setSelection(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setSelection({
        rect: { top: rect.top + window.scrollY - 44, left: rect.left + rect.width / 2 },
        start,
        end,
        text,
      });
    };

    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.doc-grifo-btn')) return;
      setSelection(null);
    };

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousedown', onDocMouseDown);
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousedown', onDocMouseDown);
    };
  }, []);

  const onClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const target = e.target as HTMLElement;
    const mark = target.closest('mark[data-highlight-id]') as HTMLElement | null;
    if (mark && onHighlightClick) {
      const id = mark.getAttribute('data-highlight-id');
      if (id) onHighlightClick(id);
    }
  };

  return (
    <>
      <div ref={containerRef} className="doc-content" onClick={onClick}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || ''}</ReactMarkdown>
      </div>
      {selection && (
        <button
          type="button"
          className="doc-grifo-btn"
          data-color={activeColor}
          style={{ top: selection.rect.top, left: selection.rect.left }}
          onClick={() => {
            onAddHighlight({
              start: selection.start,
              end: selection.end,
              text: selection.text,
              color: activeColor,
            });
            window.getSelection()?.removeAllRanges();
            setSelection(null);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M3 17l6-6 4 4 8-8" />
          </svg>
          Grifar
        </button>
      )}
    </>
  );
}
