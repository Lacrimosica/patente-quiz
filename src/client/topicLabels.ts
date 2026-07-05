/**
 * Display labels for the canonical (English snake_case) topic keys stored in
 * the DB. The keys are stable machine identifiers; these are the Italian
 * strings shown to the user. Unknown keys fall back to a humanized form so a
 * newly-added topic still renders something sensible.
 */
const TOPIC_LABELS: Record<string, string> = {
  license_categories: "Categorie di patente",
  license_points: "Punti patente",
  license_suspension: "Sospensione della patente",
  license_validity: "Validità della patente",
  license_revision: "Revisione della patente",
  license_revocation: "Revoca della patente",
  license_withdrawal: "Ritiro della patente",
  sanctions: "Sanzioni",

  alcohol: "Alcol",
  alcohol_medication_drugs: "Alcol, farmaci e droghe",

  helmet: "Casco",
  high_visibility_vest: "Giubbotto alta visibilità",
  gloves: "Guanti",
  clothing_boots: "Abbigliamento e stivali",
  jacket_clothing: "Giacca e abbigliamento",
  glasses_lenses: "Occhiali e lenti",

  liability: "Responsabilità",
  accident_liability: "Responsabilità nei sinistri",

  first_aid: "Primo soccorso",
  first_aid_wounds: "Primo soccorso: ferite",
  first_aid_hemorrhage: "Primo soccorso: emorragie",
  first_aid_eye: "Primo soccorso: occhi",
  first_aid_unconscious: "Primo soccorso: incoscienza",
  chest_trauma: "Trauma toracico",
  emergency_response: "Gestione dell'emergenza",

  shock: "Stato di shock",
  shock_unconsciousness: "Shock e incoscienza",
  unconsciousness: "Incoscienza",

  driving_attention: "Attenzione alla guida",
  attention_perception: "Attenzione e percezione",
  fatigue: "Fatica",
  stress: "Stress",
  nutrition: "Alimentazione",
  senses: "Sensi e percezione",
};

/** Human-readable Italian label for a topic key. */
export function topicLabel(key: string): string {
  return TOPIC_LABELS[key] ?? key.replace(/_/g, " ");
}
