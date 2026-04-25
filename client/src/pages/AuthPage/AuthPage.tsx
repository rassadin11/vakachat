import { useLocation, useNavigate } from "react-router-dom";
import { AuthMode } from "../../components/AuthForm/AuthForm.types";
import AuthForm from "../../components/AuthForm/AuthForm";
import AuthLayout from "../../components/AuthLayout/AuthLayout";

export default function AuthPage(): JSX.Element {
    const { pathname } = useLocation();
    const navigate = useNavigate();

    const mode: AuthMode = pathname === "/register" ? "register" : "login";

    function handleModeChange(nextMode: AuthMode): void {
        navigate(nextMode === "register" ? "/register" : "/login");
    }

    return (
        <AuthLayout>
            <AuthForm mode={mode} onModeChange={handleModeChange} />
        </AuthLayout>
    );
}