import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { Components } from 'react-markdown';
import 'highlight.js/styles/atom-one-dark.css';
import 'katex/dist/katex.min.css';
import './MarkdownMessage.scss';
import { CodeBlock } from './CodeBlock';
import { TableBlock } from './TableBlock';

interface Props {
  content: string;
  streamCursor?: boolean;
  modelId?: string;
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
