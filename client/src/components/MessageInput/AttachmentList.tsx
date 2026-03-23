import { memo } from 'react';
import type { Attachment } from '../../types';
import { FileTextIcon, FileIcon, CloseIcon } from '../../assets/icons';

interface Props {
  attachments: Attachment[];
  onRemove: (id: string) => void;
}

const AttachmentList = memo(function AttachmentList({ attachments, onRemove }: Props) {
  if (attachments.length === 0) return null;

  return (
    <div className="message-input__attachments">
      {attachments.map((att) => (
        <div key={att.id} className="message-input__attachment">
          {att.isImage ? (
            <img src={att.data} alt={att.name} className="message-input__attachment-img" />
          ) : (
            <div className="message-input__attachment-file">
              {att.isDocument ? (
                <FileTextIcon width="14" height="14" />
              ) : (
                <FileIcon width="14" height="14" />
              )}
              <span title={att.name}>{att.name}</span>
            </div>
          )}
          <button
            className="message-input__attachment-remove"
            onClick={() => onRemove(att.id)}
            title="Удалить"
          >
            <CloseIcon width="8" height="8" strokeWidth="3" />
          </button>
        </div>
      ))}
    </div>
  );
});

export default AttachmentList;
