import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { CheckmarkIcon, CopyIcon, TableIcon } from '../../assets/icons';
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
  onShowMarkdown?: (content: string) => void;
}

function getLanguage(children: React.ReactNode): string | null {
  if (!React.isValidElement(children)) return null;
  const className: string = (children as React.ReactElement<{ className?: string }>).props.className ?? '';
  const match = /language-(\w+)/.exec(className);
  return match ? match[1] : null;
}

function CodeBlock({ children, onShowMarkdown }: { children: React.ReactNode; onShowMarkdown?: (content: string) => void }) {
  const [copied, setCopied] = useState(false);
  const language = getLanguage(children);

  const handleCopy = () => {
    const code = extractText(children);
    copyToClipboard(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { });
  };

  const handleShow = () => {
    const code = extractText(children);
    onShowMarkdown?.(code);
  };

  return (
    <div className="md-code-block">
      <div className="md-code-block__header">
        <span className="md-code-block__lang">{language ?? 'code'}</span>
        <div className="md-code-block__actions">
          {language === 'markdown' && onShowMarkdown && (
            <button className="md-code-block__copy" onClick={handleShow} title="Показать превью">
              Показать ответ
            </button>
          )}
          <button className="md-code-block__copy" onClick={handleCopy} title="Скопировать">
            {copied ? (
              <>
                <CheckmarkIcon width="13" height="13" />
                Скопировано
              </>
            ) : (
              <>
                <CopyIcon width="13" height="13" />
                Копировать
              </>
            )}
          </button>
        </div>
      </div>
      <pre>{children}</pre>
    </div>
  );
}

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => copyViaExecCommand(text));
  }
  return copyViaExecCommand(text);
}

function copyViaExecCommand(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    ok ? resolve() : reject(new Error('execCommand copy failed'));
  });
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

    copyToClipboard(tsv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { });
  };

  return (
    <div className="md-table-block">
      <div className="md-table-block__header">
        <span className="md-table-block__label">
          <TableIcon width="13" height="13" />
          Таблица
        </span>
        <button className="md-table-block__copy" onClick={handleCopy} title="Скопировать для Excel">
          {copied ? (
            <>
              <CheckmarkIcon width="13" height="13" />
              Скопировано
            </>
          ) : (
            <>
              <CopyIcon width="13" height="13" />
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

export default function MarkdownMessage({ content, streamCursor, modelId, onShowMarkdown }: Props) {
  const normalized = normalizeMath(content, modelId);

  const components: Components = React.useMemo(() => ({
    pre({ children }) {
      return <CodeBlock onShowMarkdown={onShowMarkdown}>{children}</CodeBlock>;
    },
    table({ children }) {
      return <TableBlock>{children}</TableBlock>;
    },
    p({ children }) {
      const significant = React.Children.toArray(children).filter(
        (c) => !(typeof c === 'string' && c.trim() === ''),
      );
      if (significant.length === 1 && isMathDisplayElement(significant[0])) {
        return <p style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto', overflowY: "hidden" }}>{children}</p>;
      }
      return <p>{children}</p>;
    },
    img({ src, alt }) {
      return <img src={src} alt={alt ?? ''} className="md-image" />;
    },
  }), [onShowMarkdown]);

  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]} components={components}>
        {streamCursor ? normalized + '\u200B' : normalized}
      </ReactMarkdown>
      {streamCursor && <span className="md__cursor">▌</span>}
    </div>
  );
}
