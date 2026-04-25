import { useState, useRef, useEffect } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useChatStore } from '../../store/chatStore';
import './ModelSelector.scss';
import { SunIcon, ChevronDownIcon, SearchIcon } from '../../assets/icons';
import type { Model } from '../../types';

interface Props {
  chatId: string;
  currentModel: string;
}

type CompanyGroup = { company: string; models: Model[] };
type TypeSection = { type: 'language' | 'image'; label: string; groups: CompanyGroup[] };

function groupByType(models: Model[]): TypeSection[] {
  const language: Model[] = [];
  const image: Model[] = [];

  for (const m of models) {
    if (m.architecture?.output_modalities?.includes('image')) {
      image.push(m);
    } else {
      language.push(m);
    }
  }

  const toCompanyGroups = (list: Model[]): CompanyGroup[] => {
    const map = new Map<string, Model[]>();
    for (const m of list) {
      const key = m.company ?? 'Другие';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries()).map(([company, models]) => ({ company, models }));
  };

  const sections: TypeSection[] = [];
  if (language.length) sections.push({ type: 'language', label: 'Языковые модели', groups: toCompanyGroups(language) });
  if (image.length) sections.push({ type: 'image', label: 'Изображения', groups: toCompanyGroups(image) });
  return sections;
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

  const sections = groupByType(filtered);

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
            {sections.map((section, i) => (
              <div key={section.type} className={`model-selector__section ${i > 0 ? 'model-selector__section--bordered' : ''}`}>
                <span className="model-selector__section-label">{section.label}</span>
                {section.groups.map(({ company, models: groupModels }) => (
                  <div key={company} className="model-selector__group">
                    <span className="model-selector__group-label">{company}</span>
                    {groupModels.map((model) => (
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
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
