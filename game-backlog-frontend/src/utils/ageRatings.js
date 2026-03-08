// Age rating images — eagerly imported via Vite's import.meta.glob
const images = import.meta.glob('../assets/age_ratings/**/*.{svg,png,jpg,webp}', { eager: true, import: 'default' });

// Build a flat lookup: "ORG/filename_without_ext" → resolved URL
const imageIndex = {};
for (const [path, url] of Object.entries(images)) {
    const parts = path.split('/');
    const org = parts[parts.length - 2];
    const file = parts[parts.length - 1].replace(/\.[^.]+$/, '');
    imageIndex[`${org}/${file}`] = url;
}

const ORG_FOLDERS = {
    1: 'ESRB', 2: 'PEGI', 3: 'CERO', 4: 'USK', 5: 'GRAC', 6: 'CLASS_IND', 7: 'ACB'
};

/**
 * IGDB now returns rating_category as an object { id, rating, organization }.
 * The `rating` field is a string label like "M", "T", "18", "Z", etc.
 * We map (organization, ratingString) → { image path, display label }.
 */
const DATA_MAP = {
    // ESRB (1)
    '1_RP': { img: 'ESRB/ESRB_RP', lab: 'RP' },
    '1_EC': { img: 'ESRB/ESRB_Everyone', lab: 'EC' },
    '1_E': { img: 'ESRB/ESRB_Everyone', lab: 'E' },
    '1_E10+': { img: 'ESRB/ESRB_Everyone10plus', lab: 'E10+' },
    '1_T': { img: 'ESRB/ESRB_Teen', lab: 'T' },
    '1_M': { img: 'ESRB/ESRB_Mature17plus', lab: 'M' },
    '1_AO': { img: 'ESRB/ESRB_Adults_Only', lab: 'AO' },

    // PEGI (2)
    '2_3': { img: 'PEGI/PEGI_Age3', lab: '3' },
    '2_7': { img: 'PEGI/PEGI_Age7', lab: '7' },
    '2_12': { img: 'PEGI/PEGI_Age12', lab: '12' },
    '2_16': { img: 'PEGI/PEGI_Age16', lab: '16' },
    '2_18': { img: 'PEGI/PEGI_Age18', lab: '18' },

    // CERO (3)
    '3_A': { img: 'CERO/CERO_A', lab: 'A' },
    '3_B': { img: 'CERO/CERO_B', lab: 'B' },
    '3_C': { img: 'CERO/CERO_C', lab: 'C' },
    '3_D': { img: 'CERO/CERO_D', lab: 'D' },
    '3_Z': { img: 'CERO/CERO_Z', lab: 'Z' },

    // USK (4)
    '4_0': { img: 'USK/USK_0', lab: '0' },
    '4_6': { img: 'USK/USK_6', lab: '6' },
    '4_12': { img: 'USK/USK_12', lab: '12' },
    '4_16': { img: 'USK/USK_16', lab: '16' },
    '4_18': { img: 'USK/USK_18', lab: '18' },

    // GRAC (5)
    '5_All': { img: 'GRAC/GRAC_All', lab: 'All' },
    '5_12': { img: 'GRAC/GRAC_12', lab: '12' },
    '5_12+': { img: 'GRAC/GRAC_12', lab: '12' },
    '5_15': { img: 'GRAC/GRAC_15', lab: '15' },
    '5_15+': { img: 'GRAC/GRAC_15', lab: '15' },
    '5_18': { img: 'GRAC/GRAC_18', lab: '18' },
    '5_18+': { img: 'GRAC/GRAC_18', lab: '18' },
    '5_19+': { img: 'GRAC/GRAC_19', lab: '19+' },
    '5_Testing': { img: 'GRAC/GRAC_Test', lab: 'Rating Under Review' },

    // CLASS_IND (6)
    '6_L': { img: 'CLASS_IND/Classificação_Indicativa_Livre', lab: 'L' },
    '6_10': { img: 'CLASS_IND/Classificação_Indicativa_10_anos', lab: '10' },
    '6_12': { img: 'CLASS_IND/Classificação_Indicativa_12_anos', lab: '12' },
    '6_14': { img: 'CLASS_IND/Classificação_Indicativa_14_anos', lab: '14' },
    '6_16': { img: 'CLASS_IND/Classificação_Indicativa_16_anos', lab: '16' },
    '6_18': { img: 'CLASS_IND/Classificação_Indicativa_18_anos', lab: '18' },

    // ACB (7)
    '7_G': { img: 'ACB/Australian_Classification_General_(G)', lab: 'G' },
    '7_PG': { img: 'ACB/Australian_Classification_Parental_Guidance_(PG)', lab: 'PG' },
    '7_M': { img: 'ACB/Australian_Classification_Mature_(M)', lab: 'M' },
    '7_MA 15+': { img: 'ACB/Australian_Classification_Mature_15+_(MA_15+)', lab: 'MA 15+' },
    '7_R 18+': { img: 'ACB/Australian_Classification_Restricted_18+_(R_18+)', lab: 'R 18+' },
    '7_RC': { img: 'ACB/Australian_Classification_Refused_Classification_(RC)', lab: 'RC' },
};

/**
 * Get the age rating image URL for a given IGDB age_rating object.
 * rating_category from IGDB is an object { id, rating, organization }.
 * We match on the string `rating` field for the image and label lookup.
 * @param {{ organization: number, rating_category: object|number }} ageRating
 * @returns {{ src: string|null, alt: string, org: string, label: string }}
 */
export const getAgeRatingImage = (ageRating) => {
    const org = ORG_FOLDERS[ageRating.organization] || 'Unknown';

    // rating_category can be an object { id, rating, organization } or a legacy number
    const rc = ageRating.rating_category;
    const ratingString = typeof rc === 'object' && rc !== null ? rc.rating : null;

    const key = `${ageRating.organization}_${ratingString}`;

    const entry = DATA_MAP[key];
    const label = entry?.lab || ratingString || '?';
    const src = entry?.img ? (imageIndex[entry.img] || null) : null;

    return {
        src,
        alt: `${org} — ${label}`,
        org,
        label
    };
};
