import { useState, useRef } from 'react';
import { CheckmarkIcon, CopyIcon, TableIcon } from '../../assets/icons';
import { copyToClipboard } from '../../utils/copyToClipboard';

export function TableBlock({ children }: { children: React.ReactNode }) {
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
    }).catch(() => {});
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
