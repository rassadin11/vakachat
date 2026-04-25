import React, { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './PaymentModal.module.scss';
import { PaymentIcon } from '../../assets/icons';
import { paymentsApi } from '../../api/payments';
import { ApiError } from '../../api/client';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PRESETS = [10, 50, 100, 200];
const MIN_AMOUNT = 10;
const DEFAULT_AMOUNT = 100;

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
    const [amount, setAmount] = useState<number>(DEFAULT_AMOUNT);
    const [customInput, setCustomInput] = useState<string>(String(DEFAULT_AMOUNT));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

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
        } else {
            setAmount(DEFAULT_AMOUNT);
            setCustomInput(String(DEFAULT_AMOUNT));
            setIsLoading(false);
            setError('');
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    function selectPreset(preset: number) {
        setAmount(preset);
        setCustomInput(String(preset));
        setError('');
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const raw = e.target.value.replace(/[^\d.]/g, '');
        setCustomInput(raw);
        const parsed = parseFloat(raw);
        setAmount(isNaN(parsed) ? 0 : parsed);
        setError('');
    }

    async function handlePay() {
        if (amount < MIN_AMOUNT || isLoading) return;
        setIsLoading(true);
        setError('');
        try {
            const { confirmationUrl } = await paymentsApi.create(amount);
            window.location.href = confirmationUrl;
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Произошла ошибка. Попробуйте ещё раз.');
            setIsLoading(false);
        }
    }

    const isPresetActive = (preset: number) =>
        amount === preset && customInput === String(preset);

    const canPay = amount >= MIN_AMOUNT && !isLoading;

    if (!isOpen) return null;

    return createPortal(
        <div
            className={styles.overlay}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
        >
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <div className={styles.iconWrapper}>
                            <PaymentIcon />
                        </div>
                        <h2 className={styles.title} id="payment-modal-title">
                            Пополнение баланса
                        </h2>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <div className={styles.divider} />

                <div className={styles.body}>
                    <div className={styles.amountSection}>
                        <span className={styles.sectionLabel}>Выберите сумму</span>
                        <div className={styles.presetGrid}>
                            {PRESETS.map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    className={`${styles.presetBtn} ${isPresetActive(preset) ? styles.presetBtnActive : ''}`}
                                    onClick={() => selectPreset(preset)}
                                    disabled={isLoading}
                                >
                                    {preset} ₽
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.amountSection}>
                        <span className={styles.sectionLabel}>Другая сумма</span>
                        <div className={styles.amountWrap}>
                            <input
                                type="text"
                                inputMode="decimal"
                                className={styles.amountInput}
                                value={customInput}
                                onChange={handleInputChange}
                                disabled={isLoading}
                                placeholder="0"
                                aria-label="Сумма пополнения"
                            />
                            <span className={styles.amountSuffix}>₽</span>
                        </div>
                        {amount > 0 && amount < MIN_AMOUNT && (
                            <span className={styles.amountHint}>Минимум {MIN_AMOUNT} ₽</span>
                        )}
                    </div>
                </div>

                <div className={styles.divider} />

                <div className={styles.footer}>
                    {error && <p className={styles.errorMsg}>{error}</p>}
                    <button
                        type="button"
                        className={`${styles.payBtn} ${!canPay ? styles.payBtnDisabled : ''}`}
                        onClick={handlePay}
                        disabled={!canPay}
                    >
                        {isLoading ? 'Загрузка...' : 'Перейти к оплате →'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PaymentModal;
