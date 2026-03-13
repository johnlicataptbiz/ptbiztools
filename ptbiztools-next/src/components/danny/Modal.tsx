import React from 'react';
import { X } from 'lucide-react';
import type { DannyComponentProps } from './types';

interface ModalProps extends DannyComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  badgeSrc: string;
  badgeAlt: string;
  maxWidth?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badgeSrc,
  badgeAlt,
  maxWidth = '960px',
  children,
  className = ''
}) => {
  if (!isOpen) return null;

  return (
    <div className={`danny-modal-overlay ${className}`} onClick={onClose}>
      <div
        className="danny-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth }}
      >
        <div className="danny-modal-header">
          <button 
            className="danny-modal-close" 
            onClick={onClose} 
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
          <div className="danny-modal-title-row">
            <img 
              src={badgeSrc} 
              alt={badgeAlt} 
              className="danny-modal-badge" 
            />
            <div className="danny-modal-title-group">
              <h2 className="danny-modal-title">{title}</h2>
              <p className="danny-modal-subtitle">{subtitle}</p>
            </div>
          </div>
        </div>
        <div className="danny-modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export { Modal };
export type { ModalProps };
