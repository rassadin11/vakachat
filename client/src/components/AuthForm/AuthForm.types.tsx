export type AuthMode = "login" | "register";

export interface AuthFormProps {
    mode: AuthMode;
    onModeChange: (mode: AuthMode) => void;
}

export interface FormState {
    email: string;
    password: string;
    confirm: string;
}

export type TouchedFields = Partial<Record<keyof FormState, boolean>>;

export type PasswordStrength = 0 | 1 | 2 | 3;

export interface StrengthMeta {
    label: string;
    cls: string;
}