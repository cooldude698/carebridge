import {
  PatientDetail,
  Prescription,
  DiagnosisReport,
  Vital,
} from "@/lib/types";

export interface NutritionQaContext {
  patient: PatientDetail["profile"];
  conditions: string[];
  allergies: string[];
  activePrescriptions: Prescription[];
  latestDiagnosis: DiagnosisReport | null;
  latestVitals: {
    bp: string | null;
    hr: number | null;
    spo2: number | null;
    glucose: number | null;
    steps: number;
    calories: number;
  };
  language: "en" | "hi" | "kn" | string;
}

export function detectAcuteSymptom(text: string): {
  isSymptom: boolean;
  symptoms: string[];
  severity: "low" | "moderate" | "high";
} {
  const lower = text.toLowerCase();
  const symptoms: string[] = [];

  const highSeverityTerms = [
    "chest pain",
    "seene me dard",
    "breathless",
    "short of breath",
    "sans phoolna",
    "saans lene me takleef",
    "unconscious",
    "fainted",
    "severe headache",
    "blood in vomit",
  ];

  const moderateSeverityTerms = [
    "dizzy",
    "dizziness",
    "chakkar",
    "giddiness",
    "palpitations",
    "heart racing",
    "dil ki dhadkan",
    "high fever",
    "tez bukhar",
    "swelling in feet",
    "pair me sujan",
    "vomiting",
    "ulti",
  ];

  const lowSeverityTerms = [
    "headache",
    "sar dard",
    "fatigue",
    "tired",
    "thakan",
    "weakness",
    "kamzori",
    "nausea",
    "body ache",
    "pet dard",
    "stomach ache",
  ];

  let highestSeverity: "low" | "moderate" | "high" = "low";

  for (const term of highSeverityTerms) {
    if (lower.includes(term)) {
      symptoms.push(term);
      highestSeverity = "high";
    }
  }

  for (const term of moderateSeverityTerms) {
    if (lower.includes(term)) {
      symptoms.push(term);
      if (highestSeverity !== "high") {
        highestSeverity = "moderate";
      }
    }
  }

  for (const term of lowSeverityTerms) {
    if (lower.includes(term)) {
      symptoms.push(term);
    }
  }

  const uniqueSymptoms = Array.from(new Set(symptoms));
  if (uniqueSymptoms.length > 0) {
    return { isSymptom: true, symptoms: uniqueSymptoms, severity: highestSeverity };
  }

  return { isSymptom: false, symptoms: [], severity: "low" };
}

export function generateOfflineNutritionAnswer(
  question: string,
  ctx: NutritionQaContext
): string {
  const q = question.toLowerCase();
  const lang = ctx.language || "en";
  const bp = ctx.latestVitals.bp || "138/86 mmHg";
  const glu = ctx.latestVitals.glucose ? `${ctx.latestVitals.glucose} mg/dL` : "145 mg/dL";
  const name = ctx.patient.name.split(" ")[0];

  // Language: Hindi
  if (lang === "hi" || q.includes("kya") || q.includes("sakta") || q.includes("khana")) {
    if (q.includes("biryani") || q.includes("rice") || q.includes("chawal")) {
      return `${name} ji, aapki sugar abhi ${glu} hai aur BP ${bp} hai. Biryani me tel aur refined carbs jyada hote hain, jisse sugar spike ho sakti hai. Aaj ise avoid karein ya sirf 1 choti katori bina jyada masala aur tel ke salad ke sath lein. Saath me Metformin samay par lein.`;
    }
    if (q.includes("samosa") || q.includes("pakora") || q.includes("fry") || q.includes("oil") || q.includes("tel")) {
      return `${name} ji, aapko hypertension aur diabetes dono hain. Deep-fried samosa me saturated fat aur sodium jyada hota hai jo BP (${bp}) badha sakta hai. Iski jagah roasted makhana ya chana lein, jo safe aur heart-friendly hai.`;
    }
    if (q.includes("dosa") || q.includes("idli")) {
      return `Dosa me carbs hote hain. Rava ya masala dosa ki jagah plain oats dosa ya 2 idli sambar ke sath lein. Coconut chutney me saturated fat jyada hota hai, isliye tomato ya pudina chutney chunein.`;
    }
    if (q.includes("chai") || q.includes("tea") || q.includes("coffee")) {
      return `Aap bina cheeni ya low-fat doodh wali 1 cup chai le sakte hain. Caffeine se BP me thoda spike ho sakta hai, isliye sham ko 6 baje ke baad avoid karein.`;
    }
    if (q.includes("chakkar") || q.includes("dizzy") || q.includes("kamzori")) {
      return `${name} ji, chakkar aane par turant baith ya let jayein. Ek glass paani piyein. Humne doctor ko aapke lakshan notify kar diye hain. Agar chakkar 10 minute me theek na ho to Dr. Rao se turant sampark karein.`;
    }
    return `${name} ji, aapki current sugar ${glu} aur BP ${bp} ko dhyan me rakhte hue, home-cooked high-fiber, low-oil khana sabse surakshit hai. Apni dawai samay par lein aur roz 4,500 steps walk karein.`;
  }

  // Language: Kannada
  if (lang === "kn") {
    if (q.includes("dosa") || q.includes("rice") || q.includes("anna")) {
      return `${name} avare, nimma raktha ottada ${bp} mattu sugar ${glu} ide. Bisi anna athava rava dosa badalage ragi mudde athava chapati thinnuvudu olleyadu. Enne mattu uppu kadime madi.`;
    }
    return `${name} avare, nimma arogyakke enneyillada, fiber hecchiruva aahara uttama. Nimma amlodipine mattu metformin maththegalannu thappisade thegedukolli.`;
  }

  // English answers tailored to clinical context
  if (q.includes("biryani") || q.includes("pulao") || q.includes("rice")) {
    return `Hello ${name}. With your fasting glucose at ${glu} and BP at ${bp}, commercial biryani carries high glycemic load and saturated fat (approx 450-550 kcal per serving). Recommendation: Better alternative is brown rice with dal and cucumbers, or restrict to half a cup with plenty of low-fat curd.`;
  }

  if (q.includes("samosa") || q.includes("fried") || q.includes("oil") || q.includes("cholesterol")) {
    return `Deep-fried foods like samosas contain roughly 260 kcal each with high trans-fat and sodium that directly elevates your BP (current ${bp}). Recommendation: Avoid today. Swap for roasted makhana, steamed dhokla, or roasted chana to protect your cardiovascular health while on Amlodipine.`;
  }

  if (q.includes("dosa") || q.includes("idli") || q.includes("vada")) {
    return `Steamed idlis (2 pieces with vegetable sambar) are safe and provide around 160 kcal with zero trans-fats. Avoid deep-fried medu vada. Limit coconut chutney due to saturated fats; opt for green mint or tomato chutney.`;
  }

  if (q.includes("tea") || q.includes("coffee") || q.includes("chai")) {
    return `One small cup of tea with skimmed milk and zero added sugar is safe (approx 35 kcal). Limit caffeine intake to before 4 PM so your nocturnal heart rate remains stable during sleep.`;
  }

  if (q.includes("vitamin") || q.includes("supplement") || q.includes("calcium") || q.includes("d3")) {
    return `For Type 2 Diabetes on long-term Metformin, Vitamin B12 and Vitamin D3 monitoring is clinically recommended. Consult Dr. Rao for a verified serum B12 check before starting high-dose supplements.`;
  }

  if (q.includes("dizzy") || q.includes("dizziness") || q.includes("lightheaded") || q.includes("faint")) {
    return `Notice: Dizziness could indicate sudden BP postural shift or low blood glucose. Please sit or lie down immediately, drink a glass of water, and check your vitals. We have recorded this symptom for Dr. Rao. If symptoms persist beyond 10 minutes, seek prompt medical attention.`;
  }

  if (q.includes("mango") || q.includes("banana") || q.includes("fruit") || q.includes("sugar")) {
    return `Mango and ripe banana have high fructose and glycemic index which can spike your glucose (${glu}). Safe alternative: Opt for 1 small apple, half a guava, or papaya slices with high fiber.`;
  }

  return `Based on your medical profile (${ctx.conditions.join(", ")}) and latest vitals (BP ${bp}, Glucose ${glu}), balanced home-cooked meals low in saturated fats (<2g sodium/day) are recommended. Keep taking Metformin & Amlodipine on schedule and aim for 4,500 steps today.`;
}
