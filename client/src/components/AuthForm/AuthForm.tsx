import { useState } from "react";
import { useAuthForm } from "./useAuthForm";
import type { AuthFormProps } from "./AuthForm.types";
import styles from "./AuthForm.module.scss";
import FormField from "../FormField/FormField";
import { CheckIcon, EmailIcon, EyeIcon } from "../../assets/icons";
import { StrengthBar } from "./StrengthBar";

export default function AuthForm({ mode, onModeChange }: AuthFormProps): JSX.Element {
    const isRegister = mode === "register";

    const [showPwd, setShowPwd] = useState<boolean>(false);
    const [showConf, setShowConf] = useState<boolean>(false);

    const {
        fields,
        submitted,
        success,
        isFormValid,
        errors,
        isValid,
        strength,
        isLoading,
        setEmail,
        setPassword,
        setConfirm,
        touch,
        handleSubmit,
    } = useAuthForm(mode);

    return (
        <>
            <header className={styles.header}>
                <div className={styles.modeToggle}>
                    <button
                        type="button"
                        className={`${styles.modeBtn} ${!isRegister ? styles.modeBtnActive : ""}`}
                        onClick={() => onModeChange("login")}
                    >
                        Вход
                    </button>
                    <button
                        type="button"
                        className={`${styles.modeBtn} ${isRegister ? styles.modeBtnActive : ""}`}
                        onClick={() => onModeChange("register")}
                    >
                        Регистрация
                    </button>
                </div>

                <h1 className={styles.title}>
                    {isRegister
                        ? <><span>Создать</span><br /><span className={styles.titleAccent}>аккаунт</span></>
                        : <><span>С возвращением,</span><br /><span className={styles.titleAccent}>войдите</span></>
                    }
                </h1>
                <p className={styles.subtitle}>
                    {isRegister ? "// заполните данные ниже" : "// введите учётные данные"}
                </p>
            </header>

            {/* ── Fields ── */}
            <div className={styles.fields} key={mode}>

                {/* Email */}
                <FormField
                    label="Email"
                    error={errors.email}
                    badge={isValid.email ? <><CheckIcon /> корректный</> : null}
                >
                    <div className={styles.inputWrap}>
                        <input
                            type="email"
                            className={`${styles.input} ${errors.email ? styles.inputError : isValid.email ? styles.inputValid : ""}`}
                            placeholder="you@example.com"
                            value={fields.email}
                            onChange={e => setEmail(e.target.value)}
                            onBlur={() => touch("email")}
                            autoComplete="email"
                        />
                        <span className={`${styles.inputIcon} ${styles.inputIconStatic}`}>
                            <EmailIcon />
                        </span>
                    </div>
                </FormField>

                {/* Password */}
                <FormField
                    label="Пароль"
                    hint="мин. 12 символов"
                    error={errors.password}
                    extra={isRegister && fields.password.length > 0
                        ? <StrengthBar strength={strength} />
                        : null
                    }
                >
                    <div className={styles.inputWrap}>
                        <input
                            type={showPwd ? "text" : "password"}
                            className={`${styles.input} ${errors.password ? styles.inputError : isValid.password ? styles.inputValid : ""}`}
                            placeholder="••••••••••••"
                            value={fields.password}
                            onChange={e => setPassword(e.target.value)}
                            onBlur={() => touch("password")}
                            autoComplete={isRegister ? "new-password" : "current-password"}
                        />
                        <button
                            type="button"
                            className={styles.inputIcon}
                            onClick={() => setShowPwd(v => !v)}
                            aria-label={showPwd ? "Скрыть пароль" : "Показать пароль"}
                        >
                            <EyeIcon open={showPwd} />
                        </button>
                    </div>
                </FormField>

                {/* Confirm password */}
                {isRegister && (
                    <FormField
                        label="Подтверждение пароля"
                        error={errors.confirm}
                        badge={isValid.confirm ? <><CheckIcon /> совпадает</> : null}
                    >
                        <div className={styles.inputWrap}>
                            <input
                                type={showConf ? "text" : "password"}
                                className={`${styles.input} ${errors.confirm ? styles.inputError : isValid.confirm ? styles.inputValid : ""}`}
                                placeholder="••••••••••••"
                                value={fields.confirm}
                                onChange={e => setConfirm(e.target.value)}
                                onBlur={() => touch("confirm")}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className={styles.inputIcon}
                                onClick={() => setShowConf(v => !v)}
                                aria-label={showConf ? "Скрыть пароль" : "Показать пароль"}
                            >
                                <EyeIcon open={showConf} />
                            </button>
                        </div>
                    </FormField>
                )}
            </div>

            {/* ── Submit ── */}
            <button
                type="button"
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={success || isLoading}
            >
                {success
                    ? isRegister ? "✓ Аккаунт создан" : "✓ Выполнен вход"
                    : isRegister ? "Создать аккаунт" : "Войти"
                }
            </button>

            {submitted && !isFormValid && !success && (
                <div className={`${styles.feedback} ${styles.feedbackError}`}>
                    ⚠ Исправьте ошибки перед отправкой
                </div>
            )}

            {success && (
                <div className={`${styles.feedback} ${styles.feedbackSuccess}`}>
                    <CheckIcon />
                    {isRegister
                        ? "Аккаунт успешно создан. Проверьте email для подтверждения."
                        : "Вход выполнен успешно."}
                </div>
            )}
        </>
    );
}