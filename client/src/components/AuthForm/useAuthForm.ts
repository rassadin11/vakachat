import { useState, useEffect } from "react";
import type { AuthMode, FormState, TouchedFields, PasswordStrength } from "./AuthForm.types";
import { authApi } from "../../api/auth";
import { useNavigate } from "react-router";
import { ApiError, setAccessToken } from "../../api/client";
import { useChatStore } from "../../store/chatStore";

function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function getPasswordStrength(pwd: string): PasswordStrength {
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

interface UseAuthFormReturn {
    fields: FormState;
    touched: TouchedFields;
    submitted: boolean;
    success: boolean;
    isFormValid: boolean;
    isLoading: boolean;
    errors: Record<keyof FormState, string>;
    isValid: Record<keyof FormState, boolean>;
    strength: PasswordStrength;
    errorMessage: string;

    setIsLoading: (v: boolean) => void;
    setEmail: (v: string) => void;
    setPassword: (v: string) => void;
    setConfirm: (v: string) => void;
    touch: (field: keyof FormState) => void;
    handleSubmit: () => void;
    setErrorMessage: (msg: string) => void;
    setPromo: (promo: string) => void;
}

export function useAuthForm(mode: AuthMode): UseAuthFormReturn {
    const isRegister = mode === "register";

    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirm, setConfirm] = useState<string>("");
    const [promo, setPromo] = useState("");
    const [touched, setTouched] = useState<TouchedFields>({});
    const [submitted, setSubmitted] = useState<boolean>(false);
    const [success, setSuccess] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [errorMessage, setErrorMessage] = useState('')

    const navigate = useNavigate();

    useEffect(() => {
        setEmail("");
        setPassword("");
        setConfirm("");
        setPromo("");
        setTouched({});
        setSubmitted(false);
        setSuccess(false);
    }, [mode]);

    function touch(field: keyof FormState): void {
        setTouched(prev => ({ ...prev, [field]: true }));
    }

    const emailValid = validateEmail(email);
    const pwdValid = password.length >= 8;
    const confirmValid = confirm === password;

    const isFormValid = emailValid && pwdValid && (!isRegister || confirmValid);

    const errors: Record<keyof FormState, string> = {
        email:
            touched.email && !emailValid
                ? "Введите корректный email-адрес"
                : "",
        password:
            touched.password && password.length > 0 && !pwdValid
                ? "Минимум 8 символов"
                : "",
        confirm:
            isRegister && touched.confirm && confirm.length > 0 && !confirmValid
                ? "Пароли не совпадают"
                : "",
        promo: "",
    };

    const isValid: Record<keyof FormState, boolean> = {
        email: Boolean(touched.email && emailValid),
        password: Boolean(touched.password && pwdValid),
        confirm: Boolean(touched.confirm && confirm.length > 0 && confirmValid),
        promo: true
    };

    async function handleSubmit(): Promise<void> {
        setSubmitted(true);
        setTouched({ email: true, password: true, confirm: true, promo: true });
        if (!isFormValid) return;

        setIsLoading(true)

        try {
            if (isRegister) {
                const data = await authApi.register({ email, password, name: email.split("@")[0], promo });
                setAccessToken(data.accessToken);
            } else {
                const data = await authApi.login({ email, password });
                setAccessToken(data.accessToken);
            }

            const user = await authApi.me();
            useChatStore.getState().setUser(user);
            useChatStore.getState().setIsGuest(false);
            navigate("/");
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.fields) {
                    if (e.fields.promo) {
                        errors.promo = e.fields.promo;
                        setErrorMessage(e.fields.promo);
                    }
                    if (e.fields.email) {
                        setErrorMessage(e.fields.email);
                    }
                } else {
                    setErrorMessage(e.message);
                }
            } else {
                setErrorMessage("Произошла ошибка. Попробуйте еще раз.");
            }

            setSuccess(false);
        }

        setIsLoading(false)
    }

    return {
        fields: { email, password, confirm, promo },
        touched,
        submitted,
        success,
        isFormValid,
        errors,
        isValid,
        strength: getPasswordStrength(password),
        isLoading,
        errorMessage,
        setEmail,
        setPassword,
        setConfirm,
        setPromo,
        setIsLoading,
        touch,
        handleSubmit,
        setErrorMessage
    };
}