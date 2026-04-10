import { useEffect } from 'react';
import { CloseIcon, DownloadIcon } from '../../assets/icons';

interface Props {
  src: string;
  onClose: () => void;
}

export function ImageLightbox({ src, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="lightbox" onClick={onClose}>
      <button className="lightbox__close" onClick={onClose} title="Закрыть">
        <CloseIcon width="20" height="20" strokeWidth="2" />
      </button>
      <a
        className="lightbox__download"
        href={src}
        download
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        title="Скачать"
      >
        <DownloadIcon width="18" height="18" />
      </a>
      <img
        src={src}
        alt="Fullscreen"
        className="lightbox__img"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
