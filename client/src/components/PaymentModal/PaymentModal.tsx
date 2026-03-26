// components/PaymentModal/PaymentModal.tsx
import React, { useEffect, useCallback } from 'react';
import styles from './PaymentModal.module.scss';
import { PaymentIcon } from '../../assets/icons';
import { createPortal } from 'react-dom';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        },
        [onClose]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className={styles.overlay}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
        >
            <div
                className={styles.modal}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Шапка */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <div className={styles.iconWrapper}>
                            <PaymentIcon />
                        </div>
                        <h2 className={styles.title} id="payment-modal-title">
                            Оплата
                        </h2>
                    </div>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="Закрыть"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M2 2L14 14M14 2L2 14"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                            />
                        </svg>
                    </button>
                </div>

                <div className={styles.divider} />

                <div className={styles.body}>
                    {/* Иллюстрация */}
                    <div className={styles.illustration}>
                        <svg
                            width="56"
                            height="56"
                            viewBox="0 0 56 56"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <rect
                                x="6"
                                y="14"
                                width="44"
                                height="30"
                                rx="5"
                                stroke="var(--accent)"
                                strokeWidth="2"
                                strokeOpacity="0.6"
                            />
                            <path
                                d="M6 23h44"
                                stroke="var(--accent)"
                                strokeWidth="2"
                                strokeOpacity="0.6"
                            />
                            <path
                                d="M14 9h28"
                                stroke="var(--accent)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeOpacity="0.4"
                            />
                            <circle
                                cx="40"
                                cy="35"
                                r="4"
                                fill="var(--accent)"
                                fillOpacity="0.5"
                            />
                            <circle
                                cx="36"
                                cy="35"
                                r="4"
                                fill="var(--accent)"
                                fillOpacity="0.25"
                            />
                            {/* Иконка паузы / тест-режима */}
                            <circle
                                cx="28"
                                cy="35"
                                r="8"
                                fill="var(--warning-dim)"
                                stroke="var(--warning)"
                                strokeWidth="1.5"
                                strokeOpacity="0.7"
                            />
                            <path
                                d="M26 32v6M30 32v6"
                                stroke="var(--warning)"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeOpacity="0.9"
                            />
                        </svg>
                    </div>

                    {/* Бейдж тестового режима */}
                    <div className={styles.badge}>
                        <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
                            <path
                                d="M6 5v3M6 3.5v.5"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                            />
                        </svg>
                        <span>Тестовый режим</span>
                    </div>

                    {/* Текст */}
                    <p className={styles.description}>
                        В данный момент оплата недоступна.
                    </p>
                    <p className={styles.subDescription}>
                        Сайт находится в&nbsp;тестовом режиме. Функция пополнения баланса
                        будет активирована после завершения тестирования.
                    </p>
                </div>

                {/* Футер */}
                <div className={styles.footer}>
                    <button className={styles.okBtn} onClick={onClose}>
                        Понятно
                    </button>
                </div>
            </div>
        </div>, document.body
    );
};

export default PaymentModal;
