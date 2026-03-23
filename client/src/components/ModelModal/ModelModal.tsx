import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useChatStore, GUEST_ALLOWED_PREFIXES } from '../../store/chatStore';
import './ModelModal.scss';
import Loading from '../Loading/Loading';
import { CloseIcon, SearchIcon, ChatBubbleIcon, ImageIcon, LockIcon } from '../../assets/icons';
import { ModelCard } from './ModelCard';
import { filterAndSortModels } from './filterAndSortModels';
import { LabelSortItem } from './LabelSortItem';
import { SortDir, SortKey } from './types';

interface Props {
  onClose: () => void;
}

const CLOSE_DURATION = 180; // мс — должно совпадать с длительностью CSS-анимации

export default function ModelModal({ onClose }: Props) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [isClosing, setIsClosing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const allModels = useChatStore((s) => s.models);
  const isGuest = useChatStore((s) => s.isGuest);
  const models = isGuest
    ? allModels.filter(m => GUEST_ALLOWED_PREFIXES.some(p => m.id.startsWith(p)))
    : allModels;
  const lockedModels = isGuest
    ? allModels.filter(m => !GUEST_ALLOWED_PREFIXES.some(p => m.id.startsWith(p)))
    : [];
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

  const { filteredLocked, sorted, textModels, imageModels } = filterAndSortModels(
    models, lockedModels, search, sortKey, sortDir,
  );

  return createPortal(
    <div className={`model-modal-overlay ${isClosing ? 'model-modal-overlay--closing' : ''}`} onClick={handleClose}>
      <div className={`model-modal ${isClosing ? 'model-modal--closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="model-modal__header">
          <div className="model-modal__header-left">
            <h2 className="model-modal__title">Выбор модели</h2>
            {isGuest && (
              <span className="model-modal__guest-badge">Пробный режим</span>
            )}
          </div>
          <button className="model-modal__close" onClick={handleClose} title="Закрыть">
            <CloseIcon width="16" height="16" />
          </button>
        </div>

        <div className="model-modal__search-wrap">
          <SearchIcon width="15" height="15" />
          <input
            ref={searchRef}
            className="model-modal__search"
            placeholder="Поиск модели..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="model-modal__search-clear" onClick={() => setSearch('')}>
              <CloseIcon width="13" height="13" />
            </button>
          )}
        </div>

        <div className="model-modal__sort-bar">
          <span className="model-modal__sort-label">Сортировка:</span>
          <LabelSortItem sortKey={sortKey} sortDir={sortDir} itemKey="default" label="Популярность" onClick={handleSortClick} />
          <LabelSortItem sortKey={sortKey} sortDir={sortDir} itemKey="input" label="Цена входа" onClick={handleSortClick} />
          <LabelSortItem sortKey={sortKey} sortDir={sortDir} itemKey="output" label="Цена выхода" onClick={handleSortClick} />
        </div>

        {isLoadingModels ? <Loading /> : <div className="model-modal__grid">
          {sorted.length === 0 && (
            <p className="model-modal__empty">Ничего не найдено</p>
          )}

          {textModels.length > 0 && (
            <>
              {imageModels.length > 0 && (
                <div className="model-modal__section-header">
                  <ChatBubbleIcon width="14" height="14" />
                  Языковые модели
                </div>
              )}
              {textModels.map((model) => <ModelCard key={model.id} model={model} isActive={model.id === currentModel.id} activeChatId={activeChatId ?? null} handleClose={handleClose} />)}
            </>
          )}

          {imageModels.length > 0 && (
            <>
              <div className="model-modal__section-header">
                <ImageIcon width="14" height="14" />
                Генерация изображений
              </div>
              {imageModels.map((model) => <ModelCard key={model.id} model={model} isActive={model.id === currentModel.id} activeChatId={activeChatId ?? null} handleClose={handleClose} />)}
            </>
          )}

          {filteredLocked.length > 0 && (
            <>
              <div className="model-modal__section-header model-modal__section-header--locked">
                <LockIcon width="14" height="14" />
                Доступно после регистрации
              </div>
              {filteredLocked.map((model) => (
                <ModelCard key={model.id} model={model} isActive={false} activeChatId={activeChatId ?? null} handleClose={handleClose} locked />
              ))}
            </>
          )}
        </div>}
      </div>
    </div>,
    document.body,
  );
}
