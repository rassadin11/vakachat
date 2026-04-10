import React, { useState } from 'react';
import { CheckmarkIcon, CopyIcon } from '../../assets/icons';
import { copyToClipboard } from '../../utils/copyToClipboard';

function getLanguage(children: React.ReactNode): string | null {
  if (!React.isValidElement(children)) return null;
  const className: string = (children as React.ReactElement<{ className?: string }>).props.className ?? '';
  const match = /language-(\w+)/.exec(className);
  return match ? match[1] : null;
}

export function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node && typeof node === 'object' && 'props' in (node as object)) {
    return extractText((node as React.ReactElement).props.children);
  }
  return '';
}

export function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const language = getLanguage(children);

  const handleCopy = () => {
    const code = extractText(children);
    copyToClipboard(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="md-code-block">
      <div className="md-code-block__header">
        <span className="md-code-block__lang">{language ?? 'code'}</span>
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
      <pre>{children}</pre>
    </div>
  );
}
