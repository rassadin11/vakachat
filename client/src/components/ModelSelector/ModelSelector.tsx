import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import './ModelSelector.scss';

interface Props {
  chatId: string;
  currentModel: string;
}

export default function ModelSelector({ chatId, currentModel }: Props) {
  const models = useChatStore((s) => s.models);
  const isLoadingModels = useChatStore((s) => s.isLoadingModels);
  const setModel = useChatStore((s) => s.setModel);

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const currentModelName = models.find((m) => m.id === currentModel)?.name ?? currentModel;

  const filtered = models.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="model-selector" ref={dropdownRef}>
      <button
        className="model-selector__trigger"
        onClick={() => setIsOpen((v) => !v)}
        disabled={isLoadingModels}
      >
        {isLoadingModels ? (
          <span className="model-selector__loading">Загрузка моделей...</span>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
            <span className="model-selector__label">{currentModelName}</span>
            <svg
              className={`model-selector__chevron ${isOpen ? 'model-selector__chevron--open' : ''}`}
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </>
        )}
      </button>

      {isOpen && (
        <div className="model-selector__dropdown">
          <div className="model-selector__search-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={searchRef}
              className="model-selector__search"
              placeholder="Поиск модели..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="model-selector__list">
            {filtered.length === 0 && (
              <p className="model-selector__no-results">Ничего не найдено</p>
            )}
            {filtered.map((model) => (
              <button
                key={model.id}
                className={`model-selector__item ${model.id === currentModel ? 'model-selector__item--active' : ''}`}
                onClick={() => {
                  setModel(chatId, model.id, model.name);
                  setIsOpen(false);
                }}
              >
                <span className="model-selector__item-name">{model.name}</span>
                <span className="model-selector__item-id">{model.id}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
