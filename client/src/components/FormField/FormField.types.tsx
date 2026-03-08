import type { ReactNode } from "react";

export interface FormFieldProps {
    label: string;
    hint?: string;
    badge?: ReactNode;
    error?: string;
    extra?: ReactNode;
    children: ReactNode;
}