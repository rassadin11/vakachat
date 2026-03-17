import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useChatStore } from '../../store/chatStore';
import { ProviderLogo } from './ProviderLogo';
import './ModelModal.scss';
import Loading from '../Loading/Loading';
import { Model } from '../../types';

interface Props {
  onClose: () => void;
}

type SortKey = 'default' | 'input' | 'output';
type SortDir = 'asc' | 'desc';

function formatPrice(pricing?: Model["pricing"]) {
  if (!pricing) return null;

  const inp = parseFloat(pricing.promptRUB) * 10_000;
  const out = parseFloat(pricing.completionRUB) * 10_000;

  const fmt = (n: number) =>
    n === 0 ? '$0' : n < 8 ? `${n.toFixed(3)} ₽` : `${n.toFixed(2)} ₽`;
  return { free: false, input: fmt(inp), output: fmt(out) };
}

function getPrice(pricing: { prompt: string; completion: string } | undefined, field: 'prompt' | 'completion'): number {
  return parseFloat(pricing?.[field] ?? '0');
}

const CLOSE_DURATION = 180; // мс — должно совпадать с длительностью CSS-анимации

function isReasoningModel(model: import('../../types').Model): boolean {
  if (model.supported_parameters?.includes('reasoning')) return true;
  const id = model.id.toLowerCase();
  return (
    /\/o\d/.test(id) ||
    id.includes('-r1') ||
    id.includes(':thinking') ||
    id.includes('qwq') ||
    id.includes('deepseek-r')
  );
}

function isVisionModel(model: import('../../types').Model): boolean {
  return model.architecture?.input_modalities?.includes('image') ?? false;
}

function isFilesModel(model: import('../../types').Model): boolean {
  return model.architecture?.input_modalities?.includes('file') ?? false;
}

interface ModelCardProps {
  model: import('../../types').Model;
  isActive: boolean;
  activeChatId: string | null;
  handleClose: () => void;
}

function ModelCard({ model, isActive, activeChatId, handleClose }: ModelCardProps) {
  const price = formatPrice(model.pricing);
  const reasoning = isReasoningModel(model);
  const vision = isVisionModel(model);
  const setModel = useChatStore((s) => s.setModel);
  const file = isFilesModel(model);

  return (
    <button
      className={`model-card ${isActive ? 'model-card--active' : ''}`}
      onClick={() => {
        if (activeChatId) setModel(model.id);
        handleClose();
      }}
    >
      {isActive && (
        <div className="model-card__check">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
      )}
      <div className="model-card__logo">
        <ProviderLogo modelId={model.id} size={40} />
      </div>
      <div className="model-card__name">{model.name}</div>
      {(reasoning || vision || file) && (
        <div className="model-card__badges">
          {reasoning && (
            <span className="model-card__badge model-card__badge--reasoning" title="Думает — модель рассуждает перед ответом">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.14Z" />
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.14Z" />
              </svg>
              Думает
            </span>
          )}
          {vision && (
            <span className="model-card__badge model-card__badge--vision" title="Изображения — принимает изображения на вход">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Изображения
            </span>
          )}
          {file && (
            <span className="model-card__badge model-card__badge--file" title="Файлы — принимает файлы на вход">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Файлы
            </span>
          )}
        </div>
      )}
      <div className="model-card__id">{model.id}</div>
      <div className="model-card__price">
        {!price ? (
          <span className="model-card__price-unknown">—</span>
        ) : price.free ? (
          <span className="model-card__price-free">Бесплатно</span>
        ) : (
          <>
            <span className="model-card__price-row">
              <span className="model-card__price-arrow">↑</span>
              {price.input}
            </span>
            <span className="model-card__price-row">
              <span className="model-card__price-arrow">↓</span>
              {price.output}
            </span>
            <span className="model-card__price-unit">* за 10K токенов</span>
          </>
        )}
      </div>
    </button>
  );
}

export default function ModelModal({ onClose }: Props) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [isClosing, setIsClosing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const models = useChatStore((s) => s.models);
  const currentModel = useChatStore((s) => s.activeModel);
  const isLoadingModels = useChatStore((s) => s.isLoadingModels);
  const activeChatId = useChatStore((s) => s.activeChat?.id);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, CLOSE_DURATION);
  };

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 50);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const handleSortClick = (key: SortKey) => {
    if (key === 'default') {
      setSortKey('default');
      return;
    }
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = models.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase()),
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'default') return 0;
    const field = sortKey === 'input' ? 'prompt' : 'completion';
    const diff = getPrice(a.pricing, field) - getPrice(b.pricing, field);
    return sortDir === 'asc' ? diff : -diff;
  });

  const textModels = sorted.filter(
    (m) => !m.architecture?.output_modalities?.includes('image'),
  );
  const imageModels = sorted.filter(
    (m) => m.architecture?.output_modalities?.includes('image'),
  );

  const sortLabel = (key: SortKey, label: string) => {
    const isActive = sortKey === key;
    return (
      <button
        className={`model-modal__sort-btn ${isActive ? 'model-modal__sort-btn--active' : ''}`}
        onClick={() => handleSortClick(key)}
      >
        {label}
        {key !== 'default' && isActive && (
          <svg
            className={`model-modal__sort-arrow ${sortDir === 'desc' ? 'model-modal__sort-arrow--desc' : ''}`}
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          >
            <path d="M12 5v14M6 13l6 6 6-6" />
          </svg>
        )}
        {key !== 'default' && !isActive && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4">
            <path d="M12 5v14M6 13l6 6 6-6" />
          </svg>
        )}
      </button>
    );
  };

  return createPortal(
    <div className={`model-modal-overlay ${isClosing ? 'model-modal-overlay--closing' : ''}`} onClick={handleClose}>
      <div className={`model-modal ${isClosing ? 'model-modal--closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="model-modal__header">
          <h2 className="model-modal__title">Выбор модели</h2>
          <button className="model-modal__close" onClick={handleClose} title="Закрыть">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="model-modal__search-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={searchRef}
            className="model-modal__search"
            placeholder="Поиск модели..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="model-modal__search-clear" onClick={() => setSearch('')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="model-modal__sort-bar">
          <span className="model-modal__sort-label">Сортировка:</span>
          {sortLabel('default', 'Популярность')}
          {sortLabel('input', 'Цена входа')}
          {sortLabel('output', 'Цена выхода')}
        </div>

        {isLoadingModels ? <Loading /> : <div className="model-modal__grid">
          {sorted.length === 0 && (
            <p className="model-modal__empty">Ничего не найдено</p>
          )}

          {textModels.length > 0 && (
            <>
              {imageModels.length > 0 && (
                <div className="model-modal__section-header">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Языковые модели
                </div>
              )}
              {textModels.map((model) => <ModelCard key={model.id} model={model} isActive={model.id === currentModel.id} activeChatId={activeChatId ?? null} handleClose={handleClose} />)}
            </>
          )}

          {imageModels.length > 0 && (
            <>
              <div className="model-modal__section-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                Генерация изображений
              </div>
              {imageModels.map((model) => <ModelCard key={model.id} model={model} isActive={model.id === currentModel.id} activeChatId={activeChatId ?? null} handleClose={handleClose} />)}
            </>
          )}
        </div>}
      </div>
    </div>,
    document.body,
  );
}
