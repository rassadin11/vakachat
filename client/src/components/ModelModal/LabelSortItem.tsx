import { SortArrowIcon } from '../../assets/icons';
import { SortKey, SortDir } from './filterAndSortModels';

interface Props {
  sortKey: SortKey;
  sortDir: SortDir;
  itemKey: SortKey;
  label: string;
  onClick: (key: SortKey) => void;
}

export function LabelSortItem({ sortKey, sortDir, itemKey, label, onClick }: Props) {
  const isActive = sortKey === itemKey;

  return (
    <button
      className={`model-modal__sort-btn ${isActive ? 'model-modal__sort-btn--active' : ''}`}
      onClick={() => onClick(itemKey)}
    >
      {label}
      {itemKey !== 'default' && isActive && (
        <SortArrowIcon
          className={`model-modal__sort-arrow ${sortDir === 'desc' ? 'model-modal__sort-arrow--desc' : ''}`}
          width="12" height="12"
        />
      )}
      {itemKey !== 'default' && !isActive && (
        <SortArrowIcon width="12" height="12" strokeWidth="2" opacity={0.4} />
      )}
    </button>
  );
}
