import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { Components } from 'react-markdown';
import 'highlight.js/styles/atom-one-dark.css';
import 'katex/dist/katex.min.css';
import './MarkdownMessage.scss';

interface Props {
  content: string;
  streamCursor?: boolean;
  modelId?: string;
}

function getLanguage(children: React.ReactNode): string | null {
  if (!React.isValidElement(children)) return null;
  const className: string = (children as React.ReactElement<{ className?: string }>).props.className ?? '';
  const match = /language-(\w+)/.exec(className);
  return match ? match[1] : null;
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const language = getLanguage(children);

  const handleCopy = () => {
    const code = extractText(children);
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="md-code-block">
      <div className="md-code-block__header">
        <span className="md-code-block__lang">{language ?? 'code'}</span>
        <button className="md-code-block__copy" onClick={handleCopy} title="Скопировать">
          {copied ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Скопировано
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Копировать
            </>
          )}
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  );
}

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node && typeof node === 'object' && 'props' in (node as object)) {
    return extractText((node as React.ReactElement).props.children);
  }
  return '';
}

function TableBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    const table = wrapRef.current?.querySelector('table');
    if (!table) return;

    const tsv = Array.from(table.querySelectorAll('tr'))
      .map((row) =>
        Array.from(row.querySelectorAll('th, td'))
          .map((cell) => cell.textContent?.trim() ?? '')
          .join('\t'),
      )
      .join('\n');

    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="md-table-block">
      <div className="md-table-block__header">
        <span className="md-table-block__label">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M3 15h18M9 3v18" />
          </svg>
          Таблица
        </span>
        <button className="md-table-block__copy" onClick={handleCopy} title="Скопировать для Excel">
          {copied ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Скопировано
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Копировать для Excel
            </>
          )}
        </button>
      </div>
      <div className="md-table-wrap" ref={wrapRef}>
        <table>{children}</table>
      </div>
    </div>
  );
}

function isMathDisplayElement(child: React.ReactNode): boolean {
  return (
    React.isValidElement(child) &&
    String((child as React.ReactElement<{ className?: string }>).props.className ?? '').includes('katex')
  );
}

const components: Components = {
  pre({ children }) {
    return <CodeBlock>{children}</CodeBlock>;
  },
  table({ children }) {
    return <TableBlock>{children}</TableBlock>;
  },
  p({ children }) {
    const significant = React.Children.toArray(children).filter(
      (c) => !(typeof c === 'string' && c.trim() === ''),
    );
    if (significant.length === 1 && isMathDisplayElement(significant[0])) {
      return <p style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>{children}</p>;
    }
    return <p>{children}</p>;
  },
  img({ src, alt }) {
    return <img src={src} alt={alt ?? ''} className="md-image" />;
  },
};

// Модели, использующие \[...\] и \(...\) вместо $$...$$ и $...$
const LATEX_BRACKET_MODELS = ['openai/', 'deepseek/', 'z-ai/', 'moonshotai/'];

function normalizeMath(text: string, modelId?: string): string {
  if (modelId && LATEX_BRACKET_MODELS.some((p) => modelId.startsWith(p))) {
    return text
      .replace(/\\\[/g, '$$').replace(/\\\]/g, '$$')
      .replace(/\\\(/g, '$').replace(/\\\)/g, '$');
  }
  return text;
}

export default function MarkdownMessage({ content, streamCursor, modelId }: Props) {
  const normalized = normalizeMath(content, modelId);
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]} components={components}>
        {streamCursor ? normalized + '\u200B' : normalized}
      </ReactMarkdown>
      {streamCursor && <span className="md__cursor">▌</span>}
    </div>
  );
}
