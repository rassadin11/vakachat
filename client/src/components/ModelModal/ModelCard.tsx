import { useChatStore } from '../../store/chatStore';
import { ProviderLogo } from './ProviderLogo';
import { Model } from '../../types';
import { CheckmarkIcon, BrainIcon, VisionIcon, FileIcon } from '../../assets/icons';

function formatPrice(pricing?: Model["pricing"]) {
  if (!pricing) return null;

  const inp = parseFloat(pricing.promptRUB) * 10_000;
  const out = parseFloat(pricing.completionRUB) * 10_000;

  const fmt = (n: number) =>
    n === 0 ? '$0' : n < 8 ? `${n.toFixed(3)} ₽` : `${n.toFixed(2)} ₽`;
  return { free: false, input: fmt(inp), output: fmt(out) };
}

function isReasoningModel(model: Model): boolean {
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

function isVisionModel(model: Model): boolean {
  return !!model.architecture?.input_modalities?.includes('image');
}

function isFilesModel(model: Model): boolean {
  return !!model.architecture?.input_modalities?.includes('file');
}

interface ModelCardProps {
  model: Model;
  isActive: boolean;
  activeChatId: string | null;
  handleClose: () => void;
  locked?: boolean;
}

export function ModelCard({ model, isActive, activeChatId, handleClose, locked }: ModelCardProps) {
  const price = formatPrice(model.pricing);
  const reasoning = isReasoningModel(model);
  const vision = isVisionModel(model);
  const setModel = useChatStore((s) => s.setModel);
  const file = isFilesModel(model);

  return (
    <button
      className={`model-card ${isActive ? 'model-card--active' : ''} ${locked ? 'model-card--locked' : ''}`}
      onClick={() => {
        if (locked) return;
        if (activeChatId) setModel(model.id);
        handleClose();
      }}
      disabled={locked}
    >
      {isActive && (
        <div className="model-card__check">
          <CheckmarkIcon width="11" height="11" strokeWidth="3" />
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
              <BrainIcon width="11" height="11" />
              Думает
            </span>
          )}
          {vision && (
            <span className="model-card__badge model-card__badge--vision" title="Изображения — принимает изображения на вход">
              <VisionIcon width="11" height="11" />
              Изображения
            </span>
          )}
          {file && (
            <span className="model-card__badge model-card__badge--file" title="Файлы — принимает файлы на вход">
              <FileIcon width="11" height="11" />
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
