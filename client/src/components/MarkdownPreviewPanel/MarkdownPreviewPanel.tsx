import { useMemo, useEffect, useRef } from 'react';
import { Document, Paragraph, TextRun, Packer, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, AlignmentType } from 'docx';
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

const BASE_FONT = 'Times New Roman';
const BASE_SIZE = 28; // 14pt в half-points
const LINE_SPACING = { line: 360, lineRule: 'auto' as const }; // 1.5 строки
// H1=24pt, H2=22pt, H3=20pt, H4=18pt, H5=16pt, H6=14pt
const HEADING_SIZES = [48, 44, 40, 36, 32, 28];

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',
  'a':'ᵃ','b':'ᵇ','c':'ᶜ','d':'ᵈ','e':'ᵉ','f':'ᶠ','g':'ᵍ','h':'ʰ','i':'ⁱ','j':'ʲ',
  'k':'ᵏ','l':'ˡ','m':'ᵐ','n':'ⁿ','o':'ᵒ','p':'ᵖ','r':'ʳ','s':'ˢ','t':'ᵗ','u':'ᵘ',
  'v':'ᵛ','w':'ʷ','x':'ˣ','y':'ʸ','z':'ᶻ','+':'⁺','-':'⁻','=':'⁼','(':'⁽',')':'⁾',
};
const SUBSCRIPT_MAP: Record<string, string> = {
  '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉',
  'a':'ₐ','e':'ₑ','i':'ᵢ','j':'ⱼ','k':'ₖ','l':'ₗ','m':'ₘ','n':'ₙ','o':'ₒ','p':'ₚ',
  'r':'ᵣ','s':'ₛ','t':'ₜ','u':'ᵤ','v':'ᵥ','x':'ₓ','+':'₊','-':'₋','=':'₌','(':'₍',')':'₎',
};
const toSup = (s: string) => [...s].map(c => SUPERSCRIPT_MAP[c] ?? c).join('');
const toSub = (s: string) => [...s].map(c => SUBSCRIPT_MAP[c] ?? c).join('');

function latexToUnicode(tex: string): string {
  return tex
    .replace(/\\alpha/g,'α').replace(/\\beta/g,'β').replace(/\\gamma/g,'γ').replace(/\\delta/g,'δ')
    .replace(/\\epsilon/g,'ε').replace(/\\varepsilon/g,'ε').replace(/\\zeta/g,'ζ').replace(/\\eta/g,'η')
    .replace(/\\theta/g,'θ').replace(/\\iota/g,'ι').replace(/\\kappa/g,'κ').replace(/\\lambda/g,'λ')
    .replace(/\\mu/g,'μ').replace(/\\nu/g,'ν').replace(/\\xi/g,'ξ').replace(/\\pi/g,'π')
    .replace(/\\rho/g,'ρ').replace(/\\sigma/g,'σ').replace(/\\tau/g,'τ').replace(/\\upsilon/g,'υ')
    .replace(/\\phi/g,'φ').replace(/\\varphi/g,'φ').replace(/\\chi/g,'χ').replace(/\\psi/g,'ψ').replace(/\\omega/g,'ω')
    .replace(/\\Gamma/g,'Γ').replace(/\\Delta/g,'Δ').replace(/\\Theta/g,'Θ').replace(/\\Lambda/g,'Λ')
    .replace(/\\Xi/g,'Ξ').replace(/\\Pi/g,'Π').replace(/\\Sigma/g,'Σ').replace(/\\Upsilon/g,'Υ')
    .replace(/\\Phi/g,'Φ').replace(/\\Psi/g,'Ψ').replace(/\\Omega/g,'Ω')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1/$2)')
    .replace(/\\sqrt\{([^}]*)\}/g, '√($1)').replace(/\\sqrt/g,'√')
    .replace(/\\sum/g,'∑').replace(/\\prod/g,'∏').replace(/\\int/g,'∫').replace(/\\oint/g,'∮')
    .replace(/\\infty/g,'∞').replace(/\\partial/g,'∂').replace(/\\nabla/g,'∇')
    .replace(/\^{([^}]*)}/g, (_,s) => toSup(s)).replace(/\^([0-9a-zA-Z+\-(])/, (_,c) => toSup(c))
    .replace(/_{([^}]*)}/g, (_,s) => toSub(s)).replace(/_([0-9a-zA-Z])/, (_,c) => toSub(c))
    .replace(/\\leq/g,'≤').replace(/\\geq/g,'≥').replace(/\\neq/g,'≠').replace(/\\approx/g,'≈')
    .replace(/\\equiv/g,'≡').replace(/\\sim/g,'∼').replace(/\\ll/g,'≪').replace(/\\gg/g,'≫')
    .replace(/\\rightarrow/g,'→').replace(/\\leftarrow/g,'←').replace(/\\Rightarrow/g,'⇒')
    .replace(/\\Leftarrow/g,'⇐').replace(/\\leftrightarrow/g,'↔').replace(/\\Leftrightarrow/g,'⇔')
    .replace(/\\cdot/g,'·').replace(/\\times/g,'×').replace(/\\div/g,'÷').replace(/\\pm/g,'±').replace(/\\mp/g,'∓')
    .replace(/\\in/g,'∈').replace(/\\notin/g,'∉').replace(/\\subset/g,'⊂').replace(/\\subseteq/g,'⊆')
    .replace(/\\cup/g,'∪').replace(/\\cap/g,'∩').replace(/\\emptyset/g,'∅')
    .replace(/\\forall/g,'∀').replace(/\\exists/g,'∃').replace(/\\nexists/g,'∄')
    .replace(/\\ldots/g,'…').replace(/\\cdots/g,'⋯').replace(/\\therefore/g,'∴').replace(/\\because/g,'∵')
    .replace(/\{|\}/g,'').replace(/\\[a-zA-Z]+/g,'')
    .trim();
}

function parseInline(text: string, size = BASE_SIZE): TextRun[] {
  const parts = text.split(/(\*\*[^*]*\*\*|\*[^*]*\*|`[^`]*`|\$[^$]+\$)/g);
  return parts.flatMap(part => {
    if (!part) return [];
    if (part.startsWith('**')) return [new TextRun({ text: part.slice(2, -2), bold: true, font: BASE_FONT, size })];
    if (part.startsWith('*')) return [new TextRun({ text: part.slice(1, -1), italics: true, font: BASE_FONT, size })];
    if (part.startsWith('`')) return [new TextRun({ text: part.slice(1, -1), font: 'Courier New', size: BASE_SIZE })];
    if (part.startsWith('$')) return [new TextRun({ text: latexToUnicode(part.slice(1, -1)), italics: true, font: BASE_FONT, size })];
    return [new TextRun({ text: part, font: BASE_FONT, size })];
  });
}

const CELL_BORDER = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const CELL_BORDERS = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER };

function isSeparatorRow(line: string): boolean {
  return /^\s*\|[\s\-:|]+\|\s*$/.test(line);
}

function parseTableRow(line: string): string[] {
  return line.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
}

function buildTable(tableLines: string[]): Table {
  const dataRows = tableLines.filter(l => !isSeparatorRow(l));
  const headerCells = parseTableRow(dataRows[0] ?? '');
  const colCount = headerCells.length;

  const docxRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: headerCells.map(cell => new TableCell({
        borders: CELL_BORDERS,
        shading: { type: ShadingType.SOLID, fill: 'E8E8E8', color: 'auto' },
        children: [new Paragraph({
          children: [new TextRun({ text: cell, bold: true, font: BASE_FONT, size: BASE_SIZE })],
        })],
      })),
    }),
    ...dataRows.slice(1).map(rowLine => {
      const cells = parseTableRow(rowLine);
      while (cells.length < colCount) cells.push('');
      return new TableRow({
        children: cells.slice(0, colCount).map(cell => new TableCell({
          borders: CELL_BORDERS,
          children: [new Paragraph({ children: parseInline(cell) })],
        })),
      });
    }),
  ];

  return new Table({
    rows: docxRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function makeMathParagraph(formula: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: latexToUnicode(formula), italics: true, font: BASE_FONT, size: BASE_SIZE })],
    alignment: AlignmentType.CENTER,
    spacing: { ...LINE_SPACING, before: 80, after: 80 },
  });
}

function markdownToDocx(content: string, title: string): Document {
  // Normalize \[...\] and \(...\) to $$...$$ and $...$ for uniform handling
  const normalized = content
    .replace(/\\\[([^]*?)\\\]/g, (_,f) => `$$${f}$$`)
    .replace(/\\\(([^]*?)\\\)/g, (_,f) => `$${f}$`);
  const lines = normalized.split('\n').map(l => l.replace(/\r$/, ''));
  const children: (Paragraph | Table)[] = [];
  let inCodeBlock = false;
  const codeLines: string[] = [];
  let inTable = false;
  const tableLines: string[] = [];
  let inDisplayMath = false;
  const mathLines: string[] = [];

  const flushCodeLines = () => {
    for (const codeLine of codeLines) {
      children.push(new Paragraph({
        children: [new TextRun({ text: codeLine || ' ', font: 'Courier New', size: BASE_SIZE })],
        shading: { type: ShadingType.SOLID, fill: 'F2F2F2', color: 'auto' },
        spacing: { before: 0, after: 0 },
        indent: { left: 240 },
      }));
    }
    codeLines.length = 0;
    inCodeBlock = false;
  };

  const flushTable = () => {
    if (tableLines.length >= 2) {
      children.push(buildTable([...tableLines]));
      children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
    }
    tableLines.length = 0;
    inTable = false;
  };

  for (const line of lines) {
    // Display math block: opening/closing $$
    const trimmed = line.trim();
    if (trimmed === '$$') {
      if (inDisplayMath) {
        children.push(makeMathParagraph(mathLines.join(' ')));
        mathLines.length = 0;
        inDisplayMath = false;
      } else {
        if (inTable) flushTable();
        inDisplayMath = true;
      }
      continue;
    }
    if (inDisplayMath) { mathLines.push(trimmed); continue; }

    // Single-line display math: $$formula$$
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
      if (inTable) flushTable();
      children.push(makeMathParagraph(trimmed.slice(2, -2).trim()));
      continue;
    }

    if (line.startsWith('```')) {
      if (inTable) flushTable();
      if (inCodeBlock) {
        flushCodeLines();
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) { codeLines.push(line); continue; }

    if (line.startsWith('|')) {
      inTable = true;
      tableLines.push(line);
      continue;
    }
    if (inTable) flushTable();

    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length - 1;
      const hSize = HEADING_SIZES[level];
      children.push(new Paragraph({
        children: [new TextRun({ text: headingMatch[2], bold: true, font: BASE_FONT, size: hSize })],
        spacing: { ...LINE_SPACING, before: 120, after: 60 },
      }));
    } else if (/^[-*+]\s/.test(line)) {
      children.push(new Paragraph({ children: parseInline(line.replace(/^[-*+]\s/, '')), bullet: { level: 0 }, spacing: LINE_SPACING }));
    } else if (/^\d+\.\s/.test(line)) {
      children.push(new Paragraph({ children: parseInline(line.replace(/^\d+\.\s/, '')), spacing: LINE_SPACING }));
    } else if (line.trim() === '') {
      children.push(new Paragraph({ children: [new TextRun({ text: '', font: BASE_FONT, size: BASE_SIZE })], spacing: LINE_SPACING }));
    } else {
      children.push(new Paragraph({ children: parseInline(line), spacing: LINE_SPACING }));
    }
  }

  if (inCodeBlock) flushCodeLines();
  if (inTable) flushTable();
  if (inDisplayMath && mathLines.length) children.push(makeMathParagraph(mathLines.join(' ')));

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
