import { useState, useRef, useEffect } from 'react';
import { Mode, ModeId } from '../../utils/modes';
import { EditIcon } from '../../assets/icons';
import ModesList from './ModesList';

interface Props {
  activeModes: Set<ModeId>;
  onToggle: (mode: Mode) => void;
}

export default function MobileModesDropdown({ activeModes, onToggle }: Props) {
  const [modesOpen, setModesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!modesOpen) return;
    function handleClick(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setModesOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [modesOpen]);

  return (
    <div className="message-input__modes-dropdown" ref={dropdownRef}>
      <button
        type="button"
        className={`message-input__modes-trigger ${activeModes.size > 0 ? 'message-input__modes-trigger--active' : ''}`}
        onClick={() => setModesOpen((v) => !v)}
      >
        <EditIcon width="14" height="14" />
        Режимы
        {activeModes.size > 0 && (
          <span className="message-input__modes-count">{activeModes.size}</span>
        )}
      </button>

      {modesOpen && (
        <div className="message-input__modes-menu">
          <ModesList variant="mobile" activeModes={activeModes} onToggle={onToggle} />
        </div>
      )}
    </div>
  );
}
