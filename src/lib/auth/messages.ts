const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Неверный email или пароль.",
  email_not_confirmed:
    "Email ещё не подтверждён. Откройте письмо и перейдите по ссылке, затем войдите.",
  email_exists: "Аккаунт с этим email уже существует. Войдите или подтвердите письмо.",
  user_already_exists: "Аккаунт с этим email уже существует. Войдите или подтвердите письмо.",
  weak_password: "Пароль слишком простой. Используйте не меньше 8 символов.",
  over_request_rate_limit: "Слишком много попыток. Подождите немного и попробуйте снова.",
  over_email_send_rate_limit: "Слишком много писем. Подождите немного и попробуйте снова.",
  signup_disabled: "Регистрация сейчас отключена.",
  email_address_invalid: "Введите корректный email.",
  email_address_not_authorized: "Этот email нельзя использовать для регистрации.",
};

export function getAuthErrorMessage(code: string | undefined) {
  if (!code) {
    return "Не удалось выполнить запрос. Попробуйте ещё раз.";
  }

  return AUTH_ERROR_MESSAGES[code] ?? "Не удалось выполнить запрос. Попробуйте ещё раз.";
}

export function validateCredentials(email: string, password: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Введите корректный email.";
  }

  if (password.length < 8) {
    return "Пароль должен содержать не меньше 8 символов.";
  }

  return null;
}
