import { useState, useRef, useEffect } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useChatStore } from '../../store/chatStore';
import './ModelSelector.scss';
import { SunIcon, ChevronDownIcon, SearchIcon } from '../../assets/icons';

interface Props {
  chatId: string;
  currentModel: string;
}

export default function ModelSelector({ currentModel }: Props) {
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

  useClickOutside(dropdownRef, () => setIsOpen(false));

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
            <SunIcon width="14" height="14" />
            <span className="model-selector__label">{currentModelName}</span>
            <ChevronDownIcon
              className={`model-selector__chevron ${isOpen ? 'model-selector__chevron--open' : ''}`}
              width="13"
              height="13"
            />
          </>
        )}
      </button>

      {isOpen && (
        <div className="model-selector__dropdown">
          <div className="model-selector__search-wrap">
            <SearchIcon width="13" height="13" />
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
                  setModel(model.id);
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
