import { PasswordStrength, StrengthMeta } from "./AuthForm.types";
import styles from './AuthForm.module.scss'

const STRENGTH_META: Record<Exclude<PasswordStrength, 0>, StrengthMeta> = {
    1: { label: "слабый", cls: styles.strengthWeak },
    2: { label: "средний", cls: styles.strengthMedium },
    3: { label: "надёжный", cls: styles.strengthStrong },
};

export function StrengthBar({ strength }: { strength: PasswordStrength }): JSX.Element | null {
    if (!strength) return null;
    const meta = STRENGTH_META[strength];

    return (
        <div className={styles.strengthWrap}>
            <div className={styles.strengthBar}>
                {([1, 2, 3] as const).map(i => (
                    <div
                        key={i}
                        className={`${styles.strengthSeg} ${strength >= i ? meta.cls : ""}`}
                    />
                ))}
            </div>
            <span className={`${styles.strengthLabel} ${meta.cls}`}>{meta.label}</span>
        </div>
    );
}