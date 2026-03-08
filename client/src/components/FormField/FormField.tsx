import type { FormFieldProps } from "./FormField.types";
import styles from "./FormField.module.scss";

export default function FormField({
    label,
    hint,
    badge,
    error,
    extra,
    children,
}: FormFieldProps): JSX.Element {
    return (
        <div className={styles.group}>
            <label className={styles.label}>
                <span>{label}</span>
                <span className={styles.labelRight}>
                    {hint && <span className={styles.hint}>{hint}</span>}
                    {badge && <span className={styles.badge}>{badge}</span>}
                </span>
            </label>

            {children}

            {error && <span className={styles.error}>⚠ {error}</span>}

            {extra}
        </div>
    );
}