import React, { useState } from 'react';

// Comprehensive map of country names / codes / synonyms to ISO 3166-1 alpha-2
const COUNTRY_NAME_TO_CODE = {
  // Saudi Arabia & Omra / Hajj
  'sa': 'sa',
  'sau': 'sa',
  'arabie saoudite': 'sa',
  'arabie': 'sa',
  'saudi': 'sa',
  'saudi arabia': 'sa',
  'ksa': 'sa',
  'omra': 'sa',
  'omrah': 'sa',
  'umrah': 'sa',
  'hajj': 'sa',
  'المملكة العربية السعودية': 'sa',
  'السعودية': 'sa',
  'عمرة': 'sa',
  'حج': 'sa',

  // Algeria
  'dz': 'dz',
  'dza': 'dz',
  'algerie': 'dz',
  'algérie': 'dz',
  'algeria': 'dz',
  'الجزائر': 'dz',

  // Turkey
  'tr': 'tr',
  'tur': 'tr',
  'turquie': 'tr',
  'turkey': 'tr',
  'turkiye': 'tr',
  'türkiye': 'tr',
  'تركيا': 'tr',
  'istanbul': 'tr',

  // UAE / Dubai
  'ae': 'ae',
  'are': 'ae',
  'emirats': 'ae',
  'émirats': 'ae',
  'emirats arabes unis': 'ae',
  'émirats arabes unis': 'ae',
  'dubai': 'ae',
  'dubaï': 'ae',
  'uae': 'ae',
  'الإمارات': 'ae',
  'الإمارات العربية المتحدة': 'ae',
  'دبي': 'ae',

  // Egypt
  'eg': 'eg',
  'egy': 'eg',
  'egypte': 'eg',
  'égypte': 'eg',
  'egypt': 'eg',
  'مصر': 'eg',
  'le caire': 'eg',
  'cairo': 'eg',

  // Tunisia
  'tn': 'tn',
  'tun': 'tn',
  'tunisie': 'tn',
  'tunisia': 'tn',
  'تونس': 'tn',

  // Morocco
  'ma': 'ma',
  'mar': 'ma',
  'maroc': 'ma',
  'morocco': 'ma',
  'المغرب': 'ma',

  // Malaysia
  'my': 'my',
  'mys': 'my',
  'malaisie': 'my',
  'malaysia': 'my',
  'ماليزيا': 'my',

  // Spain
  'es': 'es',
  'esp': 'es',
  'espagne': 'es',
  'spain': 'es',
  'إسبانيا': 'es',

  // France
  'fr': 'fr',
  'fra': 'fr',
  'france': 'fr',
  'فرنسا': 'fr',

  // Italy
  'it': 'it',
  'ita': 'it',
  'italie': 'it',
  'italy': 'it',
  'إيطاليا': 'it',

  // Qatar
  'qa': 'qa',
  'qat': 'qa',
  'qatar': 'qa',
  'قطر': 'qa',

  // Oman
  'om': 'om',
  'omn': 'om',
  'oman': 'om',
  'عمان': 'om',
  'سلطنة عمان': 'om',

  // Jordan
  'jo': 'jo',
  'jor': 'jo',
  'jordanie': 'jo',
  'jordan': 'jo',
  'الأردن': 'jo',

  // Greece
  'gr': 'gr',
  'grc': 'gr',
  'grece': 'gr',
  'grèce': 'gr',
  'greece': 'gr',
  'اليونان': 'gr',

  // Maldives
  'mv': 'mv',
  'mdv': 'mv',
  'maldives': 'mv',
  'المالديف': 'mv',

  // Thailand
  'th': 'th',
  'tha': 'th',
  'thailande': 'th',
  'thaïlande': 'th',
  'thailand': 'th',
  'تايلاند': 'th',

  // Indonesia
  'id': 'id',
  'idn': 'id',
  'indonesie': 'id',
  'indonésie': 'id',
  'indonesia': 'id',
  'إندونيسيا': 'id',

  // UK
  'gb': 'gb',
  'gbr': 'gb',
  'uk': 'gb',
  'royaume-uni': 'gb',
  'royaume uni': 'gb',
  'angleterre': 'gb',
  'united kingdom': 'gb',
  'المملكة المتحدة': 'gb',
  'بريطانيا': 'gb',

  // USA
  'us': 'us',
  'usa': 'us',
  'etats-unis': 'us',
  'états-unis': 'us',
  'united states': 'us',
  'الولايات المتحدة': 'us',
  'أمريكا': 'us',

  // European Union / Schengen
  'eu': 'eu',
  'schengen': 'eu',
  'espace schengen': 'eu',
  'europe': 'eu'
};

/**
 * Extracts ISO 2-letter country code from:
 * 1. An emoji flag string (Unicode Regional Indicator pair)
 * 2. An ISO code string directly ('sa', 'SA')
 * 3. A country name in French, English, Arabic, etc.
 */
export function getCountryCode(input) {
  if (!input || typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;

  // 1. Try Unicode Regional Indicator Symbols (Emoji Flag)
  const chars = [...raw];
  if (chars.length >= 2) {
    const code1 = chars[0].codePointAt(0);
    const code2 = chars[1].codePointAt(0);
    if (code1 >= 0x1F1E6 && code1 <= 0x1F1FF && code2 >= 0x1F1E6 && code2 <= 0x1F1FF) {
      const letter1 = String.fromCharCode(code1 - 0x1F1E6 + 65);
      const letter2 = String.fromCharCode(code2 - 0x1F1E6 + 65);
      return (letter1 + letter2).toLowerCase();
    }
  }

  // 2. Direct lookup in synonym map
  const cleanKey = raw.toLowerCase().replace(/[\(\)\[\]\-_\/]/g, ' ').replace(/\s+/g, ' ').trim();
  if (COUNTRY_NAME_TO_CODE[cleanKey]) {
    return COUNTRY_NAME_TO_CODE[cleanKey];
  }

  // 3. Partial substring lookup
  for (const [key, code] of Object.entries(COUNTRY_NAME_TO_CODE)) {
    if (key.length > 2 && (cleanKey.includes(key) || key.includes(cleanKey))) {
      return code;
    }
  }

  // 4. Exact 2-letter check
  if (/^[a-zA-Z]{2}$/.test(raw)) {
    return raw.toLowerCase();
  }

  return null;
}

/**
 * High quality Country Flag Component
 * Renders real high-res PNG/SVG flag image with seamless fallback to emoji
 */
export const CountryFlag = ({
  emoji,
  countryCode,
  destinationName,
  className = "w-4 h-3",
  fallbackEmoji = "📍",
  alt = ""
}) => {
  const [hasError, setHasError] = useState(false);

  const code = countryCode || getCountryCode(emoji) || getCountryCode(destinationName);

  if (code && !hasError) {
    return (
      <img
        src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
        srcSet={`https://flagcdn.com/w40/${code.toLowerCase()}.png 1x, https://flagcdn.com/w80/${code.toLowerCase()}.png 2x`}
        alt={alt || destinationName || emoji || code}
        className={`object-cover rounded-[2px] shadow-xs inline-block align-middle shrink-0 border border-black/10 ${className}`}
        loading="lazy"
        onError={() => setHasError(true)}
      />
    );
  }

  // If not a country flag or image failed, render emoji cleanly
  const displayEmoji = emoji && emoji !== '📍' && emoji !== 'SA' && emoji !== 'DZ' ? emoji : fallbackEmoji;
  return <span className="inline-block shrink-0 leading-none select-none text-[13px]">{displayEmoji}</span>;
};

export default CountryFlag;
