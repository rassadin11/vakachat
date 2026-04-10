import { useMemo, useEffect, useRef } from 'react';
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import MarkdownMessage from '../MarkdownMessage/MarkdownMessage';
import { CloseIcon } from '../../assets/icons';
import './MarkdownPreviewPanel.scss';

interface Props {
  content: string;
  onClose: () => void;
}

function extractTitle(content: string): string {
  const match = content.match(/^#{1,6}\s+(.+)$/m);
  return match ? match[1].trim() : 'Документ';
}

function parseInline(text: string): TextRun[] {
  const parts = text.split(/(\*\*[^*]*\*\*|\*[^*]*\*|`[^`]*`)/g);
  return parts.flatMap(part => {
    if (!part) return [];
    if (part.startsWith('**')) return [new TextRun({ text: part.slice(2, -2), bold: true })];
    if (part.startsWith('*')) return [new TextRun({ text: part.slice(1, -1), italics: true })];
    if (part.startsWith('`')) return [new TextRun({ text: part.slice(1, -1), font: 'Courier New', size: 18 })];
    return [new TextRun({ text: part })];
  });
}

function markdownToDocx(content: string, title: string): Document {
  const lines = content.split('\n').map(l => l.replace(/\r$/, ''));
  const children: Paragraph[] = [];
  let inCodeBlock = false;
  const codeLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        for (const codeLine of codeLines) {
          children.push(new Paragraph({
            children: [new TextRun({ text: codeLine || ' ', font: 'Courier New', size: 20 })],
            shading: { type: 'clear', fill: 'F2F2F2', color: 'auto' },
            spacing: { before: 0, after: 0 },
            indent: { left: 240 },
          }));
        }
        codeLines.length = 0;
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) { codeLines.push(line); continue; }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const levels = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];
      children.push(new Paragraph({ text: headingMatch[2], heading: levels[headingMatch[1].length - 1] }));
    } else if (/^[-*+]\s/.test(line)) {
      children.push(new Paragraph({ children: parseInline(line.replace(/^[-*+]\s/, '')), bullet: { level: 0 } }));
    } else if (/^\d+\.\s/.test(line)) {
      children.push(new Paragraph({ children: parseInline(line.replace(/^\d+\.\s/, '')) }));
    } else if (line.trim() === '') {
      children.push(new Paragraph({ text: '' }));
    } else {
      children.push(new Paragraph({ children: parseInline(line) }));
    }
  }

  return new Document({
    creator: 'VakaChat',
    title,
    sections: [{ properties: {}, children }],
  });
}

export default function MarkdownPreviewPanel({ content, onClose }: Props) {
  const title = useMemo(() => extractTitle(content), [content]);
  const mdBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (mdBlobUrlRef.current) URL.revokeObjectURL(mdBlobUrlRef.current);
    };
  }, []);

  const handleDownloadMd = () => {
    if (mdBlobUrlRef.current) URL.revokeObjectURL(mdBlobUrlRef.current);
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    mdBlobUrlRef.current = url;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.md`;
    a.click();
  };

  const handleDownloadDocx = async () => {
    const doc = markdownToDocx(content, title);
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="md-preview">
      <div className="md-preview__header">
        <span className="md-preview__title" title={title}>{title}</span>
        <div className="md-preview__actions">
          <button className="md-preview__btn md-preview__btn--label" onClick={handleDownloadMd} title="Скачать .md">.md</button>
          <button className="md-preview__btn md-preview__btn--label" onClick={handleDownloadDocx} title="Скачать .docx">.docx</button>
<button className="md-preview__btn" onClick={onClose} title="Закрыть">
            <CloseIcon width="15" height="15" />
          </button>
        </div>
      </div>
      <div className="md-preview__body">
        <MarkdownMessage content={content} />
      </div>
    </div>
  );
}
