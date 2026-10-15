import geography from "./country-geography.json";
import { countryCode, countryName } from "./countries";

const records: Record<string, { numeric: string; coordinates: number[] }> = geography;
const numericCodes = new Map(Object.entries(records).map(([code, value]) => [value.numeric, code]));
export const numericCountryCode = (value: string) => numericCodes.get(value.padStart(3, "0"));

// Pins do not depend on atlas geometry: small islands and microstates are included.
export function countryPinsFor(countries: string[]) {
  const codes = new Set(countries.map(countryCode).filter((code): code is string => !!code));
  return [...codes].map(code => ({
    code,
    name: countryName(code),
    coordinates: records[code].coordinates as [number, number],
  }));
}
