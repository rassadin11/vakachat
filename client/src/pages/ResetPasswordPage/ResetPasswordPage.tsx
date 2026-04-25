import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import FormField from "../../components/FormField/FormField";
import { EyeIcon, CheckIcon } from "../../assets/icons";
import { StrengthBar } from "../../components/AuthForm/StrengthBar";
import { authApi } from "../../api/auth";
import { ApiError } from "../../api/client";
import styles from "./ResetPasswordPage.module.scss";

function getPasswordStrength(pwd: string): 0 | 1 | 2 | 3 {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 12) score++;
    if (pwd.length >= 16) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 2) return 1;
    if (score <= 3) return 2;
    return 3;
}

export default function ResetPasswordPage(): JSX.Element {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const token = params.get("token") ?? "";

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [showConf, setShowConf] = useState(false);
    const [pwdTouched, setPwdTouched] = useState(false);
    const [confTouched, setConfTouched] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const pwdValid = password.length >= 8;
    const confirmValid = confirm === password && confirm.length > 0;
    const strength = getPasswordStrength(password);

    const pwdError = pwdTouched && password.length > 0 && !pwdValid ? "Минимум 8 символов" : "";
    const confError = confTouched && confirm.length > 0 && !confirmValid ? "Пароли не совпадают" : "";
    const confIsValid = confTouched && confirmValid;

    async function handleSubmit(): Promise<void> {
        setPwdTouched(true);
        setConfTouched(true);
        if (!pwdValid || !confirmValid) return;
        setIsLoading(true);
        setErrorMessage("");
        try {
            await authApi.resetPassword(token, password);
            setSuccess(true);
            setTimeout(() => navigate("/login"), 2000);
        } catch (e) {
            setErrorMessage(e instanceof ApiError ? e.message : "Произошла ошибка. Попробуйте ещё раз.");
        }
        setIsLoading(false);
    }

    if (!token) {
        return (
            <AuthLayout slim>
                <header className={styles.header}>
                    <h1 className={styles.title}>
                        <span>Ссылка</span><br />
                        <span className={styles.titleAccent}>недействительна</span>
                    </h1>
                    <p className={styles.subtitle}>// токен отсутствует или устарел</p>
                </header>
                <div className={`${styles.feedback} ${styles.feedbackError}`}>
                    Перейдите по ссылке из письма для сброса пароля.
                </div>
                <button
                    type="button"
                    className={styles.backLink}
                    onClick={() => navigate("/forgot-password")}
                >
                    ← запросить новую ссылку
                </button>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout slim>
            <header className={styles.header}>
                <h1 className={styles.title}>
                    <span>Новый</span><br />
                    <span className={styles.titleAccent}>пароль</span>
                </h1>
                <p className={styles.subtitle}>// создайте надёжный пароль</p>
            </header>

            <div className={styles.fields}>
                <FormField
                    label="Новый пароль"
                    hint="мин. 8 символов"
                    error={pwdError}
                    extra={password.length > 0 ? <StrengthBar strength={strength} /> : null}
                >
                    <div className={styles.inputWrap}>
                        <input
                            type={showPwd ? "text" : "password"}
                            className={`${styles.input} ${pwdError ? styles.inputError : pwdTouched && pwdValid ? styles.inputValid : ""}`}
                            placeholder="••••••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onBlur={() => setPwdTouched(true)}
                            autoComplete="new-password"
                            disabled={success}
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

                <FormField
                    label="Подтверждение пароля"
                    error={confError}
                    badge={confIsValid ? <><CheckIcon /> совпадает</> : null}
                >
                    <div className={styles.inputWrap}>
                        <input
                            type={showConf ? "text" : "password"}
                            className={`${styles.input} ${confError ? styles.inputError : confIsValid ? styles.inputValid : ""}`}
                            placeholder="••••••••••••"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            onBlur={() => setConfTouched(true)}
                            autoComplete="new-password"
                            disabled={success}
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
            </div>

            <button
                type="button"
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={isLoading || success}
            >
                {success ? "✓ Пароль изменён" : isLoading ? "Сохранение..." : "Сохранить пароль"}
            </button>

            {success && (
                <div className={`${styles.feedback} ${styles.feedbackSuccess}`}>
                    Пароль успешно изменён. Перенаправление на вход...
                </div>
            )}

            {errorMessage && (
                <div className={`${styles.feedback} ${styles.feedbackError}`}>
                    {errorMessage}
                </div>
            )}
        </AuthLayout>
    );
}
