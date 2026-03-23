import { MODES, Mode, ModeId } from '../../utils/modes';
import { CheckmarkIcon } from '../../assets/icons';

interface Props {
  activeModes: Set<ModeId>;
  onToggle: (mode: Mode) => void;
  variant: 'desktop' | 'mobile';
  onMouseEnter?: (e: React.MouseEvent<HTMLButtonElement>, text: string) => void;
  onMouseLeave?: () => void;
}

export default function ModesList({ activeModes, onToggle, variant, onMouseEnter, onMouseLeave }: Props) {
  if (variant === 'desktop') {
    return (
      <>
        {MODES.map((mode) => (
          <button
            key={mode.id}
            className={`message-input__mode-btn ${activeModes.has(mode.id) ? 'message-input__mode-btn--active' : ''}`}
            onClick={() => onToggle(mode)}
            onMouseEnter={(e) => onMouseEnter?.(e, mode.title)}
            onMouseLeave={onMouseLeave}
            type="button"
          >
            <span className="message-input__mode-icon">{mode.icon}</span>
            {mode.label}
          </button>
        ))}
      </>
    );
  }

  return (
    <>
      {MODES.map((mode) => {
        const isActive = activeModes.has(mode.id);
        return (
          <button
            key={mode.id}
            type="button"
            className={`message-input__modes-option ${isActive ? 'message-input__modes-option--active' : ''}`}
            onClick={() => onToggle(mode)}
          >
            <span className="message-input__mode-icon">{mode.icon}</span>
            <span className="message-input__modes-option-label">{mode.label}</span>
            {isActive && (
              <CheckmarkIcon className="message-input__modes-check" width="13" height="13" />
            )}
          </button>
        );
      })}
    </>
  );
}
