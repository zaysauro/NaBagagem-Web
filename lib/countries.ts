// ISO alpha-2 codes for 193 UN members plus Holy See and Palestine (195).
// Dependencies, overseas territories and other disputed entities are excluded.
export const COUNTRY_CODES = "AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TZ UA UG US UY UZ VA VC VE VN VU WS YE ZA ZM ZW".split(" ");
export const COUNTRY_BASE = 195;
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
export function countryCode(value: string): string | undefined {
 const code=value.toUpperCase();if(COUNTRY_CODES.includes(code))return code;
 const aliases:Record<string,string>={holanda:"NL","coreia do sul":"KR","coreia do norte":"KP",vaticano:"VA","estados unidos da america":"US"};
 if(aliases[normalize(value)])return aliases[normalize(value)];
 for(const locale of ["pt-BR","en","ja"]){const names=new Intl.DisplayNames([locale],{type:"region"});const found=COUNTRY_CODES.find(c=>normalize(names.of(c)||c)===normalize(value));if(found)return found;}
 return undefined;
}
export const countryName=(code:string,locale="pt-BR")=>new Intl.DisplayNames([locale],{type:"region"}).of(code)||code;
