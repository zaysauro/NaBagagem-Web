export const dictionaries={
 "pt-BR":{home:"Início",search:"Buscar",feed:"Feed",discover:"Descobrir",favorites:"Favoritos",profile:"Perfil",settings:"Configurações",save:"Salvar",language:"Idioma",currency:"Moeda",preferences:"Preferências",export:"Exportar meus dados",moderation:"Aprovar comentários antes de publicar",saved:"Preferências salvas",failed:"Não foi possível salvar",logout:"Sair"},
 en:{home:"Home",search:"Search",feed:"Feed",discover:"Discover",favorites:"Saved",profile:"Profile",settings:"Settings",save:"Save",language:"Language",currency:"Currency",preferences:"Preferences",export:"Export my data",moderation:"Approve comments before publishing",saved:"Preferences saved",failed:"Could not save",logout:"Sign out"},
 ja:{home:"ホーム",search:"検索",feed:"フィード",discover:"見つける",favorites:"保存済み",profile:"プロフィール",settings:"設定",save:"保存",language:"言語",currency:"通貨",preferences:"環境設定",export:"データをエクスポート",moderation:"コメントを公開する前に承認する",saved:"設定を保存しました",failed:"保存できませんでした",logout:"ログアウト"}
} as const;
export type Locale=keyof typeof dictionaries;
export function browserLocale():Locale {const value=typeof document==="undefined"?"pt-BR":document.cookie.split("; ").find(x=>x.startsWith("nabagagem-locale="))?.split("=")[1];return value==="en"||value==="ja"?value:"pt-BR";}
export function formatMoney(value:number,currency:string,locale:Locale){return new Intl.NumberFormat(locale,{style:"currency",currency}).format(value);}
export function formatDate(value:string,locale:Locale){return new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeZone:"UTC"}).format(new Date(value));}
