type AuthResponse = { code?: string; message?: string; error?: string | { code?: string; message?: string } };
export function authFeedback(result: AuthResponse, mode: "signup" | "login", status?: number) {
 const nested = typeof result.error === "object" ? result.error : undefined;
 const code = result.code || nested?.code || "";
 const message = (result.message || nested?.message || (typeof result.error === "string" ? result.error : "")).toLowerCase();
 if (code === "INVALID_ORIGIN" || message.includes("invalid origin")) return "O acesso ainda não está habilitado neste endereço. Tente novamente quando a configuração do site for concluída.";
 if (status === 429 || code.includes("RATE_LIMIT") || message.includes("too many")) return "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
 if (code === "PASSWORD_TOO_SHORT" || message.includes("password is too short")) return "Use uma senha com pelo menos 8 caracteres.";
 if (code === "PASSWORD_TOO_LONG") return "Use uma senha com até 128 caracteres.";
 if (code.includes("USER_ALREADY_EXISTS") || message.includes("already exists")) return "Já existe uma conta com este e-mail. Entre ou recupere sua senha.";
 if (code === "EMAIL_NOT_VERIFIED") return "Confirme seu e-mail antes de entrar. Confira também a caixa de spam.";
 if (code === "INVALID_EMAIL" || message.includes("invalid email")) return "Informe um e-mail válido.";
 if (code === "INVALID_EMAIL_OR_PASSWORD" || message.includes("invalid login") || message.includes("invalid email or password")) return mode === "login" ? "E-mail ou senha incorretos. Confira os dados ou recupere sua senha." : "Não foi possível criar a conta com esses dados. Se já tiver uma conta, entre ou recupere sua senha.";
 if (status && status >= 500) return "O serviço de acesso está temporariamente indisponível. Tente novamente em instantes.";
 return mode === "signup" ? "Não foi possível criar sua conta. Confira os dados e tente novamente." : "Não foi possível entrar. Confira os dados e tente novamente.";
}
export function signupValidation(name: string, email: string, password: string) {
 if (!name.trim()) return "Informe seu nome.";
 if (name.trim().length > 100) return "Use um nome com até 100 caracteres.";
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Informe um e-mail válido.";
 if (password.length < 8) return "Use uma senha com pelo menos 8 caracteres.";
 if (password.length > 128) return "Use uma senha com até 128 caracteres.";
 return null;
}
