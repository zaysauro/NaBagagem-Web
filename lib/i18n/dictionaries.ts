const portuguese = {
  home: "Início", search: "Buscar", feed: "Feed", discover: "Descobrir", favorites: "Favoritos", profile: "Perfil", settings: "Configurações",
  save: "Salvar", saving: "Salvando…", language: "Idioma", currency: "Moeda", preferences: "Preferências", export: "Exportar meus dados",
  moderation: "Aprovar comentários antes de publicar", saved: "Preferências salvas", failed: "Não foi possível salvar", logout: "Sair",
  loadPreferencesFailed: "Não foi possível carregar suas preferências.", changePassword: "Alterar senha", currentPassword: "Senha atual",
  newPassword: "Nova senha", newPasswordHint: "Nova senha (mínimo 8 caracteres)", passwordFailed: "Não foi possível alterar a senha. Confira a senha atual.",
  passwordChanged: "Senha alterada. Outras sessões foram encerradas.", lightMode: "Ativar modo claro", darkMode: "Ativar modo noturno", openMenu: "Abrir menu", closeMenu: "Fechar menu",
  forecast: "Previsão", tripWeather: "Clima do roteiro", forecastDescription: "Previsão de até 7 dias para destinos geolocalizados.", weatherDestination: "Destino da previsão",
  weatherNoLocation: "Adicione um destino com coordenadas para consultar o clima.", weatherLoading: "Consultando previsão…", weatherFailed: "Não foi possível consultar a previsão. Tente novamente.",
  weatherRetry: "Tentar novamente", rain: "Chuva", unavailable: "Indisponível", weatherClear: "Céu limpo", weatherCloudy: "Parcialmente nublado", weatherFog: "Neblina",
  weatherDrizzle: "Garoa", weatherRain: "Chuva", weatherSnow: "Neve", weatherShowers: "Pancadas", weatherSnowShowers: "Pancadas de neve", weatherThunderstorm: "Trovoada",
};
type Dictionary = { [Key in keyof typeof portuguese]: string };
export const dictionaries = {
  "pt-BR": portuguese,
  en: {
    home: "Home", search: "Search", feed: "Feed", discover: "Discover", favorites: "Saved", profile: "Profile", settings: "Settings",
    save: "Save", saving: "Saving…", language: "Language", currency: "Currency", preferences: "Preferences", export: "Export my data",
    moderation: "Approve comments before publishing", saved: "Preferences saved", failed: "Could not save", logout: "Sign out",
    loadPreferencesFailed: "Could not load your preferences.", changePassword: "Change password", currentPassword: "Current password",
    newPassword: "New password", newPasswordHint: "New password (at least 8 characters)", passwordFailed: "Could not change your password. Check your current password.",
    passwordChanged: "Password changed. Other sessions have been signed out.", lightMode: "Use light mode", darkMode: "Use dark mode", openMenu: "Open menu", closeMenu: "Close menu",
    forecast: "Forecast", tripWeather: "Trip weather", forecastDescription: "Up to 7 days of forecasts for destinations with coordinates.", weatherDestination: "Forecast destination",
    weatherNoLocation: "Add a destination with coordinates to check the weather.", weatherLoading: "Loading forecast…", weatherFailed: "Could not load the forecast. Please try again.",
    weatherRetry: "Try again", rain: "Rain", unavailable: "Unavailable", weatherClear: "Clear sky", weatherCloudy: "Partly cloudy", weatherFog: "Fog",
    weatherDrizzle: "Drizzle", weatherRain: "Rain", weatherSnow: "Snow", weatherShowers: "Rain showers", weatherSnowShowers: "Snow showers", weatherThunderstorm: "Thunderstorm",
  },
  ja: {
    home: "ホーム", search: "検索", feed: "フィード", discover: "見つける", favorites: "保存済み", profile: "プロフィール", settings: "設定",
    save: "保存", saving: "保存中…", language: "言語", currency: "通貨", preferences: "環境設定", export: "データをエクスポート",
    moderation: "コメントを公開する前に承認する", saved: "設定を保存しました", failed: "保存できませんでした", logout: "ログアウト",
    loadPreferencesFailed: "設定を読み込めませんでした。", changePassword: "パスワードを変更", currentPassword: "現在のパスワード",
    newPassword: "新しいパスワード", newPasswordHint: "新しいパスワード（8文字以上）", passwordFailed: "パスワードを変更できませんでした。現在のパスワードを確認してください。",
    passwordChanged: "パスワードを変更しました。他のセッションはログアウトされました。", lightMode: "ライトモードに切り替え", darkMode: "ダークモードに切り替え", openMenu: "メニューを開く", closeMenu: "メニューを閉じる",
    forecast: "天気予報", tripWeather: "旅行先の天気", forecastDescription: "位置情報のある目的地の最大7日間の予報です。", weatherDestination: "予報の目的地",
    weatherNoLocation: "天気を確認するには、位置情報のある目的地を追加してください。", weatherLoading: "予報を読み込み中…", weatherFailed: "予報を読み込めませんでした。もう一度お試しください。",
    weatherRetry: "再試行", rain: "降水確率", unavailable: "情報なし", weatherClear: "快晴", weatherCloudy: "晴れ時々曇り", weatherFog: "霧",
    weatherDrizzle: "霧雨", weatherRain: "雨", weatherSnow: "雪", weatherShowers: "にわか雨", weatherSnowShowers: "にわか雪", weatherThunderstorm: "雷雨",
  },
} satisfies Record<string, Dictionary>;
export type Locale = keyof typeof dictionaries;

export function normalizeLocale(value: unknown): Locale {
  return value === "en" || value === "ja" ? value : "pt-BR";
}

export function localeFromCookie(cookie: string): Locale {
  const value = cookie.split(";").map(part => part.trim()).find(part => part.startsWith("nabagagem-locale="))?.slice("nabagagem-locale=".length);
  try { return normalizeLocale(value ? decodeURIComponent(value) : undefined); } catch { return "pt-BR"; }
}

export function browserLocale(): Locale {
  return typeof document === "undefined" ? "pt-BR" : localeFromCookie(document.cookie);
}

export function formatMoney(value: number, currency: string, locale: Locale) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
}
export function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}
