/**
 * One-off data migration: normalize question `topic` keys to a single
 * canonical vocabulary — English `snake_case`.
 *
 * The raw data grew a mix of Italian/English keys and snake_case/kebab-case.
 * This maps every legacy key to its canonical form (translating Italian and
 * merging same-concept duplicates), rewrites the raw JSON in place, and
 * reports what changed. Re-run `npm run import` afterwards to reseed the DB;
 * question ids are untouched, so per-user answers/review_state are preserved.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { RAW_DIR } from "../config.js";
import type { RawChapter } from "../shared/types.js";

/** legacy topic key -> canonical English snake_case key */
const TOPIC_MAP: Record<string, string> = {
  // alcohol / drugs
  alcol: "alcohol",
  alcohol: "alcohol",
  alcol_farmaci_droghe: "alcohol_medication_drugs",

  // protective gear / clothing
  casco: "helmet",
  giubbotto_alta_visibilita: "high_visibility_vest",
  guanti: "gloves",
  abbigliamento_stivali: "clothing_boots",
  giacca_abbigliamento: "jacket_clothing",
  occhiali_lenti: "glasses_lenses",

  // liability / accidents
  liability: "liability",
  responsabilita_sinistro: "accident_liability",

  // first aid
  first_aid: "first_aid",
  "first-aid-general": "first_aid",
  primo_soccorso: "first_aid",
  primo_soccorso_ferite: "first_aid_wounds",
  "first-aid-wounds": "first_aid_wounds",
  primo_soccorso_emorragia: "first_aid_hemorrhage",
  "first-aid-hemorrhage": "first_aid_hemorrhage",
  primo_soccorso_occhio: "first_aid_eye",
  "first-aid-eye": "first_aid_eye",
  "first-aid-unconscious": "first_aid_unconscious",
  "chest-trauma": "chest_trauma",
  "emergency-response": "emergency_response",

  // shock / consciousness
  stato_di_shock: "shock",
  shock: "shock",
  stato_di_shock_incoscienza: "shock_unconsciousness",
  incoscienza: "unconsciousness",

  // attention / physical state
  attenzione_guida: "driving_attention",
  attenzione_percezione: "attention_perception",
  fatica: "fatigue",
  stress: "stress",
  nutrition: "nutrition",
  senses: "senses",

  // license administration (already canonical)
  license_categories: "license_categories",
  license_points: "license_points",
  license_suspension: "license_suspension",
  license_validity: "license_validity",
  license_revision: "license_revision",
  license_revocation: "license_revocation",
  license_withdrawal: "license_withdrawal",
  sanctions: "sanctions",
};

const files = readdirSync(RAW_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();

let changed = 0;
let unchanged = 0;
const unmapped = new Set<string>();

for (const file of files) {
  const path = join(RAW_DIR, file);
  const data: RawChapter = JSON.parse(readFileSync(path, "utf-8"));

  for (const q of data.questions) {
    if (q.topic == null) continue;
    const canonical = TOPIC_MAP[q.topic];
    if (canonical === undefined) {
      unmapped.add(q.topic);
      continue;
    }
    if (canonical !== q.topic) changed++;
    else unchanged++;
    q.topic = canonical;
  }

  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`Rewrote ${file}`);
}

if (unmapped.size > 0) {
  console.error(
    `\nERROR: ${unmapped.size} topic(s) had no mapping and were left as-is:`
  );
  for (const t of unmapped) console.error(`  - ${t}`);
  process.exitCode = 1;
}

console.log(`\nTopics rewritten: ${changed} changed, ${unchanged} already canonical.`);
