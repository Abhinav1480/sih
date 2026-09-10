"use client";

import React from "react";
import {
  OrcaAnalysisResponse,
  RouteCandidate,
  PotentialFishingZone,
  RankedConditionChange,
  ComparisonMetric,
  TimeSeriesPoint,
} from "@/lib/types";
import {
  Compass,
  Fish,
  Navigation,
  GitCompare,
  TrendingUp,
  Waves,
} from "lucide-react";
import { NUM, bandTone, verdictTone } from "@/components/ui/tone";

interface SummaryTableProps {
  analysis: OrcaAnalysisResponse;
  selectedLanguage?: string;
}

// ────────────────────────────────────────────────────────────
// MULTILINGUAL LOCALIZATION DICTIONARY FOR SUMMARY TABLE
// ────────────────────────────────────────────────────────────
const TABLE_I18N: Record<string, Record<string, string>> = {
  // Banner Titles
  final_decision_summary: {
    en: "Final Decision Summary",
    te: "తుది నిర్ణయ సారాంశం",
    hi: "अंतिम निर्णय सारांश",
    ta: "இறுதி முடிவு சுருக்கம்",
    ml: "അന്തിമ തീരുമാന സംഗ്രഹം",
    kn: "ಅಂತಿಮ ನಿರ್ಧಾರ ಸಾರಾಂಶ",
    bn: "চূড়ান্ত সিদ্ধান্ত সারসংক্ষেপ",
    mr: "अंतिम निर्णय सारांश",
  },
  conclusion_label: {
    en: "Conclusion:",
    te: "ముగింపు / తీర్పు:",
    hi: "निष्कर्ष:",
    ta: "முடிவு:",
    ml: "തീരുമാനം:",
    kn: "ತೀರ್ಮಾನ:",
    bn: "উপসংহার:",
    mr: "निष्कर्ष:",
  },
  route_matrix: {
    en: "Route Passage Matrix",
    te: "మార్గాల విశ్లేషణ పట్టిక",
    hi: "मार्ग विश्लेषण तालिका",
    ta: "பயணப் பாதை அணி",
    ml: "യാത്രാ പാത മാട്രിക്സ്",
    kn: "ಮಾರ್ಗ ವಿಶ್ಲೇಷಣೆ ಕೋಷ್ಟಕ",
    bn: "রুট विश्लेषण ম্যাট্রিক্স",
    mr: "मार्ग विश्लेषण तक्ता",
  },
  fishing_matrix: {
    en: "Ranked Fishing Grounds",
    te: "చేపల వేట ప్రాంతాలు",
    hi: "श्रेणीबद्ध मत्स्य पालन क्षेत्र",
    ta: "மீன்பிடி மண்டலங்கள்",
    ml: "മത്സ്യബന്ധന മേഖലകൾ",
    kn: "ಮೀನುಗಾರಿಕೆ ವಲಯಗಳು",
    bn: "মাছ ধরার অঞ্চল",
    mr: "मासेमारी क्षेत्रे",
  },
  spatial_matrix: {
    en: "Spatial Displacement Matrix",
    te: "ప్రాదేశిక మార్పు విశ్లేషణ",
    hi: "स्थानिक विस्थापन तालिका",
    ta: "இடப்பெயர்ச்சி ஆய்வு",
    ml: "സ്ഥലകാല മാറ്റ വിശകലനം",
    kn: "ಪ್ರಾದೇಶಿಕ ಬದಲಾವಣೆ ಕೋಷ್ಟಕ",
    bn: "স্থানিক স্থানান্তর ম্যাট্রিক্স",
    mr: "स्थानिक बदल तक्ता",
  },
  env_matrix: {
    en: "Environmental Intelligence",
    te: "సముద్ర పర్యావరణ స్థితి",
    hi: "पर्यावरणीय विश्लेषण",
    ta: "சுற்றுச்சூழல் நிலை",
    ml: "പാരിസ്ഥിതിക വിവരങ്ങൾ",
    kn: "ಪರಿಸರ ಮಾಹಿತಿ",
    bn: "পরিবেশগত তথ্য",
    mr: "पर्यावरणीय माहिती",
  },
  comparison_matrix: {
    en: "Cross-Sector Comparison",
    te: "ప్రాంతాల పోలిక",
    hi: "क्षेत्रीय तुलना",
    ta: "பிராந்திய ஒப்பீடு",
    ml: "മേഖലാ താരതമ്യം",
    kn: "ಪ್ರಾದೇಶಿಕ ಹೋಲಿಕೆ",
    bn: "আঞ্চলিক তুলনা",
    mr: "प्रादेशिक तुलना",
  },
  trend_matrix: {
    en: "Temporal Trend Shift",
    te: "కాలక్రమ మార్పుల విశ్లేషణ",
    hi: "काल्पनिक समय प्रवृत्ति",
    ta: "காலப் போக்கு மாற்றம்",
    ml: "സമയബന്ധിത മാറ്റം",
    kn: "ಕಾಲಾನುಕ್ರಮ ಬದಲಾವಣೆ",
    bn: "সময়ভিত্তিক প্রবণতা",
    mr: "वेळेनुसार बदल",
  },

  // Column Headers
  metric: {
    en: "Metric",
    te: "కొలమానం",
    hi: "मापदंड",
    ta: "அளவுரு",
    ml: "അളവുകോൽ",
    kn: "ಪ್ಯಾರಾಮೀಟರ್",
    bn: "পরিমাপক",
    mr: "मापदंड",
  },
  recommended_route: {
    en: "Recommended Route",
    te: "సిఫార్సు చేయబడిన మార్గం",
    hi: "अनुशंसित मार्ग",
    ta: "பரிந்துரைக்கப்பட்ட பாதை",
    ml: "ശുപാർശ ചെയ്ത പാത",
    kn: "ಶಿಫಾರಸು ಮಾಡಿದ ಮಾರ್ಗ",
    bn: "প্রস্তাবিত রুট",
    mr: "शिफारस केलेला मार्ग",
  },
  alternative_route: {
    en: "Alternative Route",
    te: "ప్రత్యామ్నాయ మార్గం",
    hi: "वैकल्पिक मार्ग",
    ta: "மாற்றுப் பாதை",
    ml: "ഇതര പാത",
    kn: "ಪರ್ಯಾಯ ಮಾರ್ಗ",
    bn: "বিকল্প রুট",
    mr: "पर्यायी मार्ग",
  },
  evaluation_diff: {
    en: "Evaluation / Difference",
    te: "మూల్యాంకనం / తేడా",
    hi: "मूल्यांकन / अंतर",
    ta: "மதிப்பீடு / வேறுபாடு",
    ml: "വിലയിരുത്തൽ / വ്യത്യാസം",
    kn: "ಮೌಲ್ಯಮಾಪನ / ವ್ಯತ್ಯಾಸ",
    bn: "मूल्याয়ন / পার্থক্য",
    mr: "मूल्यांकन / फरक",
  },
  rank: {
    en: "Rank",
    te: "ర్యాంక్",
    hi: "रैंक",
    ta: "தரம்",
    ml: "റാങ്ക്",
    kn: "ಶ್ರೇಣಿ",
    bn: "র‌্যাঙ্ক",
    mr: "क्रमांक",
  },
  fishing_zone: {
    en: "Fishing Zone",
    te: "చేపల వేట ప్రాంతం",
    hi: "मत्स्य पालन क्षेत्र",
    ta: "மீன்பிடி மண்டலம்",
    ml: "മത്സ്യബന്ധന മേഖല",
    kn: "ಮೀನುಗಾರಿಕೆ ವಲಯ",
    bn: "মাছ ধরার অঞ্চল",
    mr: "मासेमारी क्षेत्र",
  },
  distance: {
    en: "Distance",
    te: "దూరం",
    hi: "दूरी",
    ta: "தூரம்",
    ml: "ദൂരം",
    kn: "ದೂರ",
    bn: "দূরত্ব",
    mr: "अंतर",
  },
  suitability: {
    en: "Suitability",
    te: "అనుకూలత",
    hi: "उपयुक्तता",
    ta: "பொருத்தம்",
    ml: "അനുയോജ്യത",
    kn: "ಸೂಕ್ತತೆ",
    bn: "উপযোগিতা",
    mr: "योग्यता",
  },
  key_factors: {
    en: "Key Factors",
    te: "ముఖ్య అంశాలు",
    hi: "प्रमुख कारक",
    ta: "முக்கிய காரணிகள்",
    ml: "പ്രധാന ഘടകങ്ങൾ",
    kn: "ಪ್ರಮುಖ ಅಂಶಗಳು",
    bn: "মূল কারণগুলি",
    mr: "मुख्य घटक",
  },
  condition: {
    en: "Condition",
    te: "పరిస్థితి",
    hi: "स्थिति",
    ta: "நிலைமை",
    ml: "സാഹചര്യം",
    kn: "ಪರಿಸ್ಥಿತಿ",
    bn: "পরিস্থিতি",
    mr: "स्थिती",
  },
  net_change: {
    en: "Net Change",
    te: "నికర మార్పు",
    hi: "शुद्ध परिवर्तन",
    ta: "நிகர மாற்றம்",
    ml: "മൊത്തം മാറ്റം",
    kn: "ನಿವ್ವಳ ಬದಲಾವಣೆ",
    bn: "মোট পরিবর্তন",
    mr: "निव्वळ बदल",
  },
  significance: {
    en: "Significance",
    te: "ఆపరేషనల్ ప్రభావం",
    hi: "परिचालन प्रभाव",
    ta: "செயல்பாட்டுத் தாக்கம்",
    ml: "പ്രവർത്തന സ്വാധീനം",
    kn: "ಕಾರ್ಯಾಚರಣೆಯ ಪ್ರಭಾವ",
    bn: "অপারেশনাল প্রভাব",
    mr: "परिचालन प्रभाव",
  },
  condition_param: {
    en: "Condition / Parameter",
    te: "పరిస్థితి / కొలమానం",
    hi: "स्थिति / मापदंड",
    ta: "நிலைமை / அளவுரு",
    ml: "സാഹചര്യം / അളവുകോൽ",
    kn: "ಪರಿಸ್ಥಿತಿ / ಪ್ಯಾರಾಮೀಟರ್",
    bn: "পরিস্থিতি / পরিমাপক",
    mr: "स्थिती / मापदंड",
  },
  value: {
    en: "Value",
    te: "విలువ",
    hi: "मान",
    ta: "மதிப்பு",
    ml: "മൂല്യം",
    kn: "ಮೌಲ್ಯ",
    bn: "মান",
    mr: "मूल्य",
  },
  severity_interp: {
    en: "Severity / Operational Interpretation",
    te: "తీవ్రత / ఆపరేషనల్ వివరణ",
    hi: "गंभीरता / परिचालन व्याख्या",
    ta: "தீவிரம் / செயல்பாட்டு விளக்கம்",
    ml: "തീവ്രത / പ്രവർത്തന വ്യാഖ്യാനം",
    kn: "ತೀವ್ರತೆ / ಕಾರ್ಯಾಚರಣೆಯ ವಿವರಣೆ",
    bn: "তীব্রতা / অপারেশনাল ব্যাখ্যা",
    mr: "तीव्रता / ऑपरेशनल स्पष्टीकरण",
  },
};

// ────────────────────────────────────────────────────────────
// PHRASES & BADGES TRANSLATION DICTIONARY
// ────────────────────────────────────────────────────────────
const TEXT_I18N: Record<string, Record<string, string>> = {
  // Metrics
  "Distance": { te: "దూరం", hi: "दूरी", ta: "தூரம்", ml: "ദൂരം", kn: "ದೂರ", bn: "দূরত্ব", mr: "अंतर" },
  "Total Distance": { te: "మొత్తం దూరం", hi: "कुल दूरी", ta: "மொத்த தூரம்", ml: "മൊത്തം ദൂരം", kn: "ಒಟ್ಟು ದೂರ", bn: "মোট দূরত্ব", mr: "एकूण अंतर" },
  "Transit Time": { te: "ప్రయాణ సమయం", hi: "पारगमन समय", ta: "பயண நேரம்", ml: "യാത്രാ സമയം", kn: "ಪ್ರಯಾಣದ ಸಮಯ", bn: "যাত্রার সময়", mr: "प्रवासाचा वेळ" },
  "Transit Duration": { te: "ప్రయాణ వ్యవధి", hi: "पारगमन अवधि", ta: "பயணக் காலம்", ml: "യാത്രാ ദൈർഘ്യം", kn: "ಪ್ರಯಾಣದ ಅವಧಿ", bn: "যাত্রার সময়কাল", mr: "प्रवासाचा कालावधी" },
  "Marine Risk": { te: "సముద్ర ప్రమాదం", hi: "समुद्री जोखिम", ta: "கடல் ஆபத்து", ml: "സമുദ്ര അപകടസാധ്യത", kn: "ಸಮುದ್ರದ ಅಪಾಯ", bn: "সামুদ্রিক ঝুঁকি", mr: "सागरी धोका" },
  "Protected Waters": { te: "రక్షిత జలాలు (MPA)", hi: "संरक्षित जलक्षेत्र (MPA)", ta: "பாதுகாக்கப்பட்ட கடற்பகுதி", ml: "സംരക്ഷിത സമുദ്ര മേഖല", kn: "ರಕ್ಷಿತ ಜಲಪ್ರದೇಶ", bn: "সংরক্ষিত জলসীমা", mr: "संरक्षित सागरी क्षेत्र" },
  "Overall Verdict": { te: "మొత్తం తీర్పు", hi: "समग्र निर्णय", ta: "ஒட்டுமொத்த தீர்ப்பு", ml: "മൊത്തത്തിലുള്ള വിധി", kn: "ಒಟ್ಟಾರೆ ತೀರ್ಪು", bn: "সামগ্রিক রায়", mr: "एकूण निर्णय" },
  "Overall Marine Hazard": { te: "సముద్ర ప్రమాద స్థాయి", hi: "समग्र समुद्री खतरा", ta: "ஒட்டுமொத்த கடல் ஆபத்து", ml: "മൊത്തം സമുദ്ര അപായം", kn: "ಒಟ್ಟಾರೆ ಸಮುದ್ರ ಅಪಾಯ", bn: "সামগ্রিক সামুদ্রিক বিপদ", mr: "एकूण सागरी धोका" },
  "Significant Wave Height": { te: "ముఖ్యమైన అలల ఎత్తు", hi: "सार्थक लहर की ऊंचाई", ta: "குறிப்பிடத்தக்க அலை உயரம்", ml: "പ്രധാന തിരമാല ഉയരം", kn: "ಗಮನಾರ್ಹ ಅಲೆಗಳ ಎತ್ತರ", bn: "তাৎপর্যপূর্ণ ঢেউয়ের উচ্চতা", mr: "महत्त्वाची लाट उंची" },
  "Swell Wave Height": { te: "స్వెల్ అలల ఎత్తు", hi: "स्वेल लहर की ऊंचाई", ta: "ஸ்வெல் அலை உயரம்", ml: "സ്വെൽ തിരമാല ഉയരം", kn: "ಸ್ವೆಲ್ ಅಲೆಗಳ ಎತ್ತರ", bn: "সোয়েল ঢেউয়ের উচ্চতা", mr: "स्वेल्ल लाट उंची" },
  "Sea Surface Temperature": { te: "సముద్ర ఉపరితల ఉష్ణోగ్రత", hi: "समुद्र सतह का तापमान", ta: "கடல் மேற்பரப்பு வெப்பநிலை", ml: "സമുദ്രോപരിതല താപനില", kn: "ಸಮುದ್ರದ ಮೇಲ್ಮೈ ತಾಪಮಾನ", bn: "সমুদ্র পৃষ্ঠের তাপমাত্রা", mr: "सागरी पृष्ठभागाचे तापमान" },
  "Ocean Surface Current": { te: "సముద్ర ఉపరితల ప్రవాహం", hi: "समुद्री सतही धारा", ta: "கடல் மேற்பரப்பு நீரோட்டம்", ml: "സമുദ്ര ഉപരിതല പ്രവാഹം", kn: "ಸಮುದ್ರ ಮೇಲ್ಮೈ ಪ್ರವಾಹ", bn: "সমুদ্রের পৃষ্ঠীয় স্রোত", mr: "सागरी पृष्ठभाग प्रवाह" },
  "Wind Speed & Gusts": { te: "గాలి వేగం మరియు తీవ్రత", hi: "हवा की गति और झोंके", ta: "காற்றின் வேகம் மற்றும் வீச்சு", ml: "കാറ്റിന്റെ വേഗതയും വീശലും", kn: "ಗಾಳಿಯ ವೇಗ ಮತ್ತು ಬಿರುಗಾಳಿ", bn: "বাতাসের গতি ও দমকা হাওয়া", mr: "वाऱ्याचा वेग आणि झोत" },
  "Atmospheric Visibility": { te: "వాతావరణ దృశ్యమానత", hi: "वायुमंडलीय दृश्यता", ta: "வளிமண்டலத் தெரிவுநிலை", ml: "കാഴ്ചപരിധി", kn: "ವಾತಾವರಣದ ಗೋಚರತೆ", bn: "বায়ুমণ্ডলীয় দৃশ্যমানতা", mr: "दृष्यमानता" },

  // Status text & Badges
  "Preferred": { te: "సిఫార్సు చేయబడింది", hi: "वरीयता प्राप्त", ta: "முன்னுரிமை", ml: "മുൻഗണന", kn: "ಆದ್ಯತೆಯ", bn: "পছন্দনীয়", mr: "प्राधान्य" },
  "Higher Risk": { te: "అధిక ప్రమాదం", hi: "अधिक जोखिम", ta: "அதிக ஆபத்து", ml: "ഉയർന്ന അപകടസാധ്യത", kn: "ಹೆಚ್ಚಿನ ಅಪಾಯ", bn: "উচ্চ ঝুঁকি", mr: "अधिक धोका" },
  "Avoided": { te: "తప్పించబడింది", hi: "बचाया गया", ta: "தவிர்க்கப்பட்டது", ml: "ഒഴിവാക്കി", kn: "ತಪ್ಪಿಸಲಾಗಿದೆ", bn: "এড়িয়ে চলা", mr: "टाळले" },
  "Intersects": { te: "ప్రవేశిస్తుంది", hi: "प्रवेश", ta: "குறுக்கிடுகிறது", ml: "പ്രവേശിക്കുന്നു", kn: "ಪ್ರವೇಶಿಸುತ್ತದೆ", bn: "প্রবেশ করে", mr: "प्रवेश करते" },
  "Lower Hazard": { te: "తక్కువ ముప్పు", hi: "कम खतरा", ta: "குறைந்த ஆபத்து", ml: "കുറഞ്ഞ അപായം", kn: "ಕಡಿಮೆ ಅಪಾಯ", bn: "কম বিপদ", mr: "कमी धोका" },
  "Sanctuary Preserved": { te: "అభయారణ్యం సంరక్షించబడింది", hi: "अभयारण्य सुरक्षित", ta: "சரணாலயம் பாதுகாக்கப்பட்டது", ml: "സങ്കേതം സംരക്ഷിക്കപ്പെട്ടു", kn: "ಅಭಯಾರಣ್ಯ ಸಂರಕ್ಷಿತ", bn: "অভয়ারণ্য সংরক্ষিত", mr: "अभयारण्य संरक्षित" },
  "Recommended": { te: "సిఫార్సు చేయబడింది", hi: "अनुशंसित", ta: "பரிந்துரைக்கப்படுகிறது", ml: "ശുപാർശ ചെയ്യുന്നു", kn: "ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ", bn: "প্রস্তাবিত", mr: "शिफारस केलेले" },
  "Best Zone": { te: "ఉత్తమ వేట ప్రాంతం", hi: "सर्वश्रेष्ठ क्षेत्र", ta: "சிறந்த மண்டலம்", ml: "മികച്ച മേഖല", kn: "ಉತ್ತಮ ವಲಯ", bn: "সেরা অঞ্চল", mr: "सर्वोत्कृष्ट क्षेत्र" },
  "MPA Restricted": { te: "నిషిద్ధ అభయారణ్యం", hi: "प्रतिबंधित क्षेत्र", ta: "பாதுகாக்கப்பட்ட பகுதி", ml: "നിയന്ത്രിത മേഖല", kn: "ನಿರ್ಬಂಧಿತ ವಲಯ", bn: "নিষিদ্ধ অঞ্চল", mr: "प्रतिबंधित क्षेत्र" },
  "Largest Change": { te: "గరిష్ట మార్పు", hi: "सर्वाधिक परिवर्तन", ta: "மிகப்பெரிய மாற்றம்", ml: "ഏറ്റവും വലിയ മാറ്റം", kn: "ಗರಿಷ್ಠ ಬದಲಾವಣೆ", bn: "সর্বাধিক পরিবর্তন", mr: "सर्वाधिक बदल" },
  "Planned Corridor": { te: "ప్రణాళికాబద్ధమైన మార్గం", hi: "नियोजित गलियारा", ta: "திட்டமிடப்பட்ட பாதை", ml: "ആസൂത്രിത പാത", kn: "ಯೋಜಿತ ಕಾರಿಡಾರ್", bn: "পরিকল্পিত করিডোর", mr: "नियोजित कॉरिडॉर" },
  "Verified Corridor": { te: "ధృవీకరించబడిన మార్గం", hi: "सत्यापित गलियारा", ta: "சரிபார்க்கப்பட்ட பாதை", ml: "സ്ഥിരീകരിച്ച പാത", kn: "ಪರಿಶೀಲಿಸಿದ ಕಾರಿಡಾರ್", bn: "যাচাইকৃত করিডোর", mr: "सत्यापित कॉरिडॉर" },
  "Restricted Waters": { te: "నిషిద్ధ జలాలు", hi: "प्रतिबंधित जलक्षेत्र", ta: "தடைசெய்யப்பட்ட கடற்பகுதி", ml: "നിയന്ത്രിത ജലാശയം", kn: "ನಿರ್ಬಂಧಿತ ಜಲಪ್ರದೇಶ", bn: "সীমাবদ্ধ জলসীমা", mr: "प्रतिबंधित क्षेत्र" },
  "Permitted Waters": { te: "అనుమతించబడిన జలాలు", hi: "अनुमति प्राप्त जलक्षेत्र", ta: "அனுமதிக்கப்பட்ட கடற்பகுதி", ml: "അനുവദനീയമായ ജലാശയം", kn: "ಅನುಮತಿಸಲಾದ ಜಲಪ್ರದೇಶ", bn: "অনুমোদিত জলসীমা", mr: "परवानगी असलेले क्षेत्र" },
  "Safe for Normal Navigation": { te: "సాధారణ సముద్ర ప్రయాణానికి అనుకూలం", hi: "सामान्य नौवहन के लिए सुरक्षित", ta: "இயல்பான வழிசெலுத்தலுக்கு பாதுகாப்பானது", ml: "സാധാരണ യാത്രയ്ക്ക് സുരക്ഷിതം", kn: "ಸಾಮಾನ್ಯ ಸಂಚಾರಕ್ಕೆ ಸುರಕ್ಷಿತ", bn: "স্বাভাবিক চলাচলের জন্য নিরাপদ", mr: "सामान्य प्रवासासाठी सुरक्षित" },
  "Exercise Caution — Swell & Wind Monitored": { te: "జాగ్రత్త వహించండి — అలలు, గాలుల పర్యవేక్షణ", hi: "सावधानी बरतें — लहरें और हवाएं सक्रिय", ta: "எச்சரிக்கையுடன் செயல்படுங்கள்", ml: "ജാഗ്രത പാലിക്കുക", kn: "ಎಚ್ಚರಿಕೆ ವಹಿಸಿ", bn: "সতর্কতা অবলম্বন করুন", mr: "काळजी घ्या" },
  "Severe Sea State — Delay Departure": { te: "తీవ్రమైన సముద్ర పరిస్థితి — ప్రయాణాన్ని వాయిదా వేయండి", hi: "गंभीर समुद्री स्थिति — प्रस्थान स्थगित करें", ta: "கடுமையான கடல் நிலை — புறப்பாட்டை தாமதப்படுத்துங்கள்", ml: "ഗുരുതര കടൽ അവസ്ഥ — യാത്ര മാറ്റിവെയ്ക്കുക", kn: "ತೀವ್ರ ಸಮುದ್ರ ಪರಿಸ್ಥಿತಿ — ಪ್ರಯಾಣ ಮುಂದೂಡಿ", bn: "মারাত্মক সমুদ্র পরিস্থিতি — যাত্রা স্থগিত রাখুন", mr: "गंभीर सागरी स्थिती — प्रस्थान पुढे ढकला" },
  "Calm / Slight Sea": { te: "ప్రశాంతమైన సముద్రం", hi: "शांत समुद्र", ta: "அமைதியான கடல்", ml: "ശാന്തമായ കടൽ", kn: "ಶಾಂತ ಸಮುದ್ರ", bn: "শান্ত সমুদ্র", mr: "शांत समुद्र" },
  "Moderate Sea State": { te: "మధ్యస్థ సముద్ర పరిస్థితి", hi: "मध्यम समुद्री स्थिति", ta: "மிதமான கடல் நிலை", ml: "മിതമായ കടൽ", kn: "ಮಧ್ಯಮ ಸಮುದ್ರ", bn: "মাঝারি সমুদ্রাবস্থা", mr: "मध्यम समुद्र" },
  "Rough Sea State": { te: "రఫ్ సముద్ర పరిస్థితి", hi: "उग्र समुद्री स्थिति", ta: "சீற்றமான கடல்", ml: "പ്രക്ഷുബ്ധമായ കടൽ", kn: "ಪ್ರಕ್ಷುಬ್ಧ ಸಮುದ್ರ", bn: "উত্তাল সমুদ্র", mr: "खवळलेला समुद्र" },
  "Normal Tropical Thermal Range": { te: "సాధారణ ఉష్ణోగ్రత పరిధి", hi: "सामान्य उष्णकटिबंधीय तापमान", ta: "இயல்பான வெப்பநிலை வரம்பு", ml: "സാധാരണ താപനില", kn: "ಸಾಮಾನ್ಯ ತಾಪಮಾನ", bn: "স্বাভাবিক তাপমাত্রা", mr: "सामान्य तापमान" },
  "Monitored Sea Temperature": { te: "పర్యవేక్షణలో ఉన్న ఉష్ణోగ్రత", hi: "निगरानी अधीन तापमान", ta: "கண்காணிக்கப்படும் வெப்பநிலை", ml: "നിരീക്ഷണത്തിലുള്ള താപനില", kn: "ಮೇಲ್ವಿಚಾರಣೆಯಲ್ಲಿರುವ ತಾಪಮಾನ", bn: "পর্যবেক্ষণাধীন তাপমাত্রা", mr: "निरीक्षणाखालील तापमान" },
  "Clear Navigational Sight": { te: "స్పష్టమైన దృశ్యమానత", hi: "स्पष्ट दृश्यता", ta: "தெளிவான பார்வை", ml: "വ്യക്തമായ കാഴ്ച", kn: "ಸ್ಪಷ್ಟ ಗೋಚರತೆ", bn: "পরিষ্কার দৃশ্যমানতা", mr: "स्पष्ट दृश्यता" },
  "Restricted Visibility": { te: "పరిమిత దృశ్యమానత", hi: "सीमित दृश्यता", ta: "வரையறுக்கப்பட்ட பார்வை", ml: "പരിമിതമായ കാഴ്ച", kn: "ಮಿತವಾದ ಗೋಚರತೆ", bn: "সীমিত দৃশ্যমানতা", mr: "मर्यादित दृश्यता" },
};

function t(key: string, lang: string): string {
  return TABLE_I18N[key]?.[lang] || TABLE_I18N[key]?.["en"] || key;
}

function localizeLabel(text: string | undefined | null, lang: string): string {
  if (!text || lang === "en") return text || "";
  if (TEXT_I18N[text]?.[lang]) return TEXT_I18N[text][lang];
  return text;
}

export const SummaryTable: React.FC<SummaryTableProps> = ({ analysis, selectedLanguage }) => {
  if (!analysis || analysis.needs_clarification) return null;

  const activeLang = selectedLanguage || analysis.detected_language || "en";
  const resultType = analysis.visualization_plan?.result_type || analysis.intent;

  // Determine which type of summary to display based on available data
  const isSpatialWhatIf =
    Boolean(analysis.spatial_what_if) ||
    resultType === "spatial_what_if_analysis" ||
    resultType === "spatial_what_if";

  const isRoute =
    Boolean(analysis.route_comparison) ||
    Boolean(analysis.route_analysis && analysis.route_analysis.waypoints?.length > 0) ||
    resultType === "route_analysis" ||
    resultType === "route_comparison";

  const isFishing =
    Boolean(analysis.fishing_zones && analysis.fishing_zones.length > 0) ||
    resultType === "fishing_zones" ||
    resultType === "fishing_recommendation" ||
    resultType === "fishing_zone_search";

  const isComparison =
    Boolean(analysis.comparison_data && analysis.comparison_data.metrics?.length > 0) ||
    resultType === "regional_comparison" ||
    resultType === "comparison";

  const isHistorical =
    Boolean(analysis.historical_trend && analysis.historical_trend.points?.length > 0) ||
    resultType === "historical_trend" ||
    resultType === "trend_analysis";

  // ────────────────────────────────────────────────────────────
  // 1. ROUTE COMPARISON / CORRIDOR SUMMARY TABLE
  // ────────────────────────────────────────────────────────────
  if (isRoute) {
    const compData = analysis.route_comparison || analysis.route_analysis?.route_comparison;
    const candidates = analysis.route_analysis?.candidate_routes || [];
    const recCandidate = candidates.find((c) => c.is_recommended) || candidates[0];
    const altCandidate = candidates.find((c) => !c.is_recommended) || candidates[1];
    const singleRoute = analysis.route_analysis;

    // Route Conclusion text - Use localized recommendation when non-English is selected
    const conclusion =
      (activeLang !== "en" && analysis.recommendation ? analysis.recommendation : null) ||
      compData?.trade_off_analysis ||
      analysis.recommendation ||
      (recCandidate && altCandidate
        ? `${recCandidate.name} is preferred (${recCandidate.distance_km} km, ${recCandidate.marine_risk} Risk, ${
            recCandidate.crosses_protected_waters ? "Intersects MPA" : "Avoids Protected Waters"
          }).`
        : `Vessel route from ${singleRoute?.origin.name} to ${singleRoute?.destination.name} spans ${singleRoute?.total_distance_km} km with ${singleRoute?.overall_route_risk} overall risk.`);

    return (
      <div className="pt-2 pb-1 space-y-2.5">
        {/* Header Banner */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-mono tabular-nums font-bold uppercase tracking-wider text-slate-200">
              {t("final_decision_summary", activeLang)}
            </span>
          </div>
          <span className="text-[10px] font-mono tabular-nums uppercase tracking-wider text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
            {t("route_matrix", activeLang)}
          </span>
        </div>

        {/* Conclusion Callout */}
        <div className="p-2.5 rounded-lg bg-orca-darkest/60 border border-white/[0.06] text-xs text-slate-300 leading-relaxed flex items-start gap-2">
          <Navigation className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-white font-semibold mr-1.5">{t("conclusion_label", activeLang)}</span>
            <span>{conclusion}</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-white/[0.06] bg-orca-darkest/50">
          <table className="w-full text-xs text-left">
            <thead className="text-[10px] font-mono tabular-nums uppercase tracking-wider text-slate-400 bg-white/[0.02] border-b border-white/[0.06]">
              <tr>
                <th className="py-2 px-3">{t("metric", activeLang)}</th>
                <th className="py-2 px-3 text-emerald-400">
                  {compData?.recommended_route_name || recCandidate?.name || t("recommended_route", activeLang)}
                </th>
                {altCandidate && (
                  <th className="py-2 px-3 text-amber-400">
                    {compData?.alternative_route_name || altCandidate?.name || t("alternative_route", activeLang)}
                  </th>
                )}
                <th className="py-2 px-3 text-right">{t("evaluation_diff", activeLang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {compData?.metrics && compData.metrics.length > 0 ? (
                compData.metrics.map((m, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2 px-3 text-white font-medium">{localizeLabel(m.metric_name, activeLang)}</td>
                    <td className="py-2 px-3 text-slate-200 font-mono tabular-nums">{m.recommended_value}</td>
                    <td className="py-2 px-3 text-slate-200 font-mono tabular-nums">{m.alternative_value}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                          m.advantage.includes("Recommended") || m.advantage.includes("Avoided")
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : m.advantage.includes("Alternative") || m.advantage.includes("Direct")
                            ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                            : "bg-orca-panel text-slate-300 border-white/[0.08]"
                        }`}
                      >
                        {localizeLabel(m.advantage, activeLang)} ({m.difference})
                      </span>
                    </td>
                  </tr>
                ))
              ) : recCandidate && altCandidate ? (
                <>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2 px-3 text-white font-medium">{localizeLabel("Distance", activeLang)}</td>
                    <td className="py-2 px-3 text-slate-200 font-mono tabular-nums">{recCandidate.distance_km} km</td>
                    <td className="py-2 px-3 text-slate-200 font-mono tabular-nums">{altCandidate.distance_km} km</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-300">
                      {(recCandidate.distance_km - altCandidate.distance_km).toFixed(1)} km
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2 px-3 text-white font-medium">{localizeLabel("Transit Time", activeLang)}</td>
                    <td className="py-2 px-3 text-slate-200 font-mono tabular-nums">{recCandidate.estimated_transit_hours} h</td>
                    <td className="py-2 px-3 text-slate-200 font-mono tabular-nums">{altCandidate.estimated_transit_hours} h</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-300">
                      {(recCandidate.estimated_transit_hours - altCandidate.estimated_transit_hours).toFixed(1)} h
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2 px-3 text-white font-medium">{localizeLabel("Marine Risk", activeLang)}</td>
                    <td className="py-2 px-3 font-mono tabular-nums">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {recCandidate.marine_risk}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        {altCandidate.marine_risk}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-400 font-semibold">
                      {localizeLabel("Lower Hazard", activeLang)}
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2 px-3 text-white font-medium">{localizeLabel("Protected Waters", activeLang)}</td>
                    <td className="py-2 px-3 font-mono tabular-nums text-emerald-300">
                      {localizeLabel(recCandidate.crosses_protected_waters ? "Intersects" : "Avoided", activeLang)}
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums text-rose-300">
                      {localizeLabel(altCandidate.crosses_protected_waters ? "Intersects" : "Avoided", activeLang)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-400 font-semibold">
                      {localizeLabel("Sanctuary Preserved", activeLang)}
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] bg-white/[0.01]">
                    <td className="py-2 px-3 text-white font-bold">{localizeLabel("Overall Verdict", activeLang)}</td>
                    <td className="py-2 px-3 font-mono tabular-nums">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {localizeLabel("Preferred", activeLang)}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {localizeLabel("Higher Risk", activeLang)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-cyan-400 font-bold">
                      {localizeLabel("Recommended", activeLang)}
                    </td>
                  </tr>
                </>
              ) : singleRoute ? (
                <>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2 px-3 text-white font-medium">{localizeLabel("Total Distance", activeLang)}</td>
                    <td className="py-2 px-3 text-slate-200 font-mono tabular-nums">{singleRoute.total_distance_km} km</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-300">{localizeLabel("Planned Corridor", activeLang)}</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2 px-3 text-white font-medium">{localizeLabel("Transit Duration", activeLang)}</td>
                    <td className="py-2 px-3 text-slate-200 font-mono tabular-nums">{singleRoute.estimated_transit_hours} hours</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-300">@ 10 kt Cruising</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2 px-3 text-white font-medium">{localizeLabel("Marine Risk", activeLang)}</td>
                    <td className="py-2 px-3 font-mono tabular-nums">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          singleRoute.overall_route_risk === "LOW"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {singleRoute.overall_route_risk}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-300">{localizeLabel("Verified Corridor", activeLang)}</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2 px-3 text-white font-medium">{localizeLabel("Protected Waters", activeLang)}</td>
                    <td className="py-2 px-3 font-mono tabular-nums text-emerald-300">
                      {singleRoute.crosses_protected_waters
                        ? `${localizeLabel("Intersects", activeLang)} (${singleRoute.protected_areas_intersected.join(", ")})`
                        : `${localizeLabel("Avoided", activeLang)} (Clear of MPAs)`}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-300">
                      {localizeLabel(singleRoute.crosses_protected_waters ? "Restricted Waters" : "Permitted Waters", activeLang)}
                    </td>
                  </tr>
                </>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // 2. FISHING INTELLIGENCE / PFZ SUMMARY TABLE
  // ────────────────────────────────────────────────────────────
  if (isFishing && analysis.fishing_zones) {
    const topZone = analysis.fishing_zones[0];
    const conclusion =
      (activeLang !== "en" && analysis.recommendation ? analysis.recommendation : null) ||
      (topZone
        ? `Top fishing ground is ${topZone.name} (${topZone.distance_km} km, Suitability: ${topZone.suitability_score}/100) with favorable chlorophyll (${topZone.chlorophyll_mg_m3} mg/m³) and sea state.`
        : analysis.executive_summary);

    return (
      <div className="pt-2 pb-1 space-y-2.5">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-mono tabular-nums font-bold uppercase tracking-wider text-slate-200">
              {t("final_decision_summary", activeLang)}
            </span>
          </div>
          <span className="text-[10px] font-mono tabular-nums uppercase tracking-wider text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
            {t("fishing_matrix", activeLang)}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-orca-darkest/60 border border-white/[0.06] text-xs text-slate-300 leading-relaxed flex items-start gap-2">
          <Fish className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-white font-semibold mr-1.5">{t("conclusion_label", activeLang)}</span>
            <span>{conclusion}</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-white/[0.06] bg-orca-darkest/50">
          <table className="w-full text-xs text-left">
            <thead className="text-[10px] font-mono tabular-nums uppercase tracking-wider text-slate-400 bg-white/[0.02] border-b border-white/[0.06]">
              <tr>
                <th className="py-2 px-3 w-12">{t("rank", activeLang)}</th>
                <th className="py-2 px-3">{t("fishing_zone", activeLang)}</th>
                <th className="py-2 px-3 font-mono tabular-nums">{t("distance", activeLang)}</th>
                <th className="py-2 px-3 font-mono tabular-nums">{t("suitability", activeLang)}</th>
                <th className="py-2 px-3">{t("key_factors", activeLang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {analysis.fishing_zones.map((zone) => (
                <tr
                  key={zone.zone_id}
                  className={`hover:bg-white/[0.02] transition-colors ${
                    zone.rank === 1 ? "bg-cyan-500/[0.03]" : ""
                  }`}
                >
                  <td className="py-2 px-3 font-mono tabular-nums font-bold">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${
                        zone.within_mpa
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : zone.rank === 1
                          ? "bg-cyan-400 text-orca-darkest font-extrabold"
                          : "bg-white/[0.06] text-slate-300"
                      }`}
                    >
                      {zone.rank}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-medium text-white">
                    <div className="flex items-center gap-1.5">
                      <span>{zone.name}</span>
                      {zone.rank === 1 && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono tabular-nums font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {localizeLabel("Best Zone", activeLang)}
                        </span>
                      )}
                      {zone.within_mpa && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono tabular-nums font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          {localizeLabel("MPA Restricted", activeLang)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 font-mono tabular-nums text-slate-300">{zone.distance_km} km</td>
                  <td className="py-2 px-3 font-mono tabular-nums font-semibold">
                    <span
                      className={
                        zone.within_mpa
                          ? "text-rose-400"
                          : zone.suitability_score >= 70
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }
                    >
                      {zone.suitability_score}/100
                    </span>
                  </td>
                  <td className="py-2 px-3 text-[11px] text-slate-300 font-mono tabular-nums">
                    Chl {zone.chlorophyll_mg_m3} mg/m³ · SST {zone.sst_c}°C · Wave {zone.wave_height_m}m
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // 3. SPATIAL WHAT-IF / DISPLACEMENT SUMMARY TABLE
  // ────────────────────────────────────────────────────────────
  if (isSpatialWhatIf && analysis.spatial_what_if) {
    const sw = analysis.spatial_what_if;
    const conclusion =
      (activeLang !== "en" && analysis.recommendation ? analysis.recommendation : null) ||
      `Moving ${sw.distance_km} km ${sw.direction} from ${sw.origin.name}: the condition changing most is ${sw.top_changed_condition}. ${sw.operational_significance}`;

    return (
      <div className="pt-2 pb-1 space-y-2.5">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-mono tabular-nums font-bold uppercase tracking-wider text-slate-200">
              {t("final_decision_summary", activeLang)}
            </span>
          </div>
          <span className="text-[10px] font-mono tabular-nums uppercase tracking-wider text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
            {t("spatial_matrix", activeLang)}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-orca-darkest/60 border border-white/[0.06] text-xs text-slate-300 leading-relaxed flex items-start gap-2">
          <Compass className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-white font-semibold mr-1.5">{t("conclusion_label", activeLang)}</span>
            <span>{conclusion}</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-white/[0.06] bg-orca-darkest/50">
          <table className="w-full text-xs text-left">
            <thead className="text-[10px] font-mono tabular-nums uppercase tracking-wider text-slate-400 bg-white/[0.02] border-b border-white/[0.06]">
              <tr>
                <th className="py-2 px-3">{t("condition", activeLang)}</th>
                <th className="py-2 px-3 font-mono tabular-nums">{sw.origin.name}</th>
                <th className="py-2 px-3 font-mono tabular-nums">
                  {sw.displaced.name || `${sw.distance_km}km ${sw.direction}`}
                </th>
                <th className="py-2 px-3 font-mono tabular-nums">{t("net_change", activeLang)}</th>
                <th className="py-2 px-3 text-right">{t("significance", activeLang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {sw.ranked_changes.map((rc) => {
                const isLargest = rc.rank === 1 || rc.metric_name === sw.top_changed_condition;
                return (
                  <tr
                    key={rc.metric_name}
                    className={`hover:bg-white/[0.02] transition-colors ${
                      isLargest ? "bg-cyan-500/[0.04]" : ""
                    }`}
                  >
                    <td className="py-2 px-3 font-medium text-white">
                      <div className="flex items-center gap-1.5">
                        <span>{localizeLabel(rc.metric_name, activeLang)}</span>
                        {isLargest && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono tabular-nums font-bold bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
                            {localizeLabel("Largest Change", activeLang)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums text-slate-300">
                      {rc.location_a_value} {rc.unit}
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums text-slate-300">
                      {rc.location_b_value} {rc.unit}
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums font-semibold">
                      <span
                        className={
                          rc.absolute_difference > 0
                            ? "text-rose-400"
                            : rc.absolute_difference < 0
                            ? "text-emerald-400"
                            : "text-slate-300"
                        }
                      >
                        {rc.absolute_difference > 0 ? "+" : ""}
                        {rc.absolute_difference} {rc.unit}
                        {rc.percentage_difference !== undefined &&
                          ` (${rc.percentage_difference > 0 ? "+" : ""}${rc.percentage_difference}%)`}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      <span className="text-[10px] text-slate-400">{rc.operational_impact}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // 4. REGIONAL COMPARISON SUMMARY TABLE
  // ────────────────────────────────────────────────────────────
  if (isComparison && analysis.comparison_data) {
    const comp = analysis.comparison_data;
    const conclusion =
      (activeLang !== "en" && analysis.recommendation ? analysis.recommendation : null) ||
      comp.overall_verdict ||
      analysis.executive_summary;

    return (
      <div className="pt-2 pb-1 space-y-2.5">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-mono tabular-nums font-bold uppercase tracking-wider text-slate-200">
              {t("final_decision_summary", activeLang)}
            </span>
          </div>
          <span className="text-[10px] font-mono tabular-nums uppercase tracking-wider text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
            {t("comparison_matrix", activeLang)}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-orca-darkest/60 border border-white/[0.06] text-xs text-slate-300 leading-relaxed flex items-start gap-2">
          <GitCompare className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-white font-semibold mr-1.5">{t("conclusion_label", activeLang)}</span>
            <span>{conclusion}</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-white/[0.06] bg-orca-darkest/50">
          <table className="w-full text-xs text-left">
            <thead className="text-[10px] font-mono tabular-nums uppercase tracking-wider text-slate-400 bg-white/[0.02] border-b border-white/[0.06]">
              <tr>
                <th className="py-2 px-3">{t("metric", activeLang)}</th>
                <th className="py-2 px-3 font-mono tabular-nums text-cyan-300">{comp.location_a.name}</th>
                <th className="py-2 px-3 font-mono tabular-nums text-cyan-300">{comp.location_b.name}</th>
                <th className="py-2 px-3 font-mono tabular-nums">{t("net_change", activeLang)}</th>
                <th className="py-2 px-3 text-right">{t("evaluation_diff", activeLang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {comp.metrics.map((m, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 px-3 font-medium text-white">{localizeLabel(m.metric_name, activeLang)}</td>
                  <td className="py-2 px-3 font-mono tabular-nums text-slate-300">
                    {m.location_a_value} {m.unit}
                  </td>
                  <td className="py-2 px-3 font-mono tabular-nums text-slate-300">
                    {m.location_b_value} {m.unit}
                  </td>
                  <td className="py-2 px-3 font-mono tabular-nums text-slate-300">
                    {m.difference > 0 ? "+" : ""}
                    {m.difference} {m.unit}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orca-panel border border-white/[0.08] text-cyan-400">
                      {m.favorability}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // 5. HISTORICAL TREND SUMMARY TABLE
  // ────────────────────────────────────────────────────────────
  if (isHistorical && analysis.historical_trend) {
    const ht = analysis.historical_trend;
    const pts = ht.points;
    const firstPt = pts[0];
    const lastPt = pts[pts.length - 1];
    const conclusion =
      (activeLang !== "en" && analysis.recommendation ? analysis.recommendation : null) ||
      ht.trend_summary ||
      analysis.executive_summary;

    return (
      <div className="pt-2 pb-1 space-y-2.5">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-mono tabular-nums font-bold uppercase tracking-wider text-slate-200">
              {t("final_decision_summary", activeLang)}
            </span>
          </div>
          <span className="text-[10px] font-mono tabular-nums uppercase tracking-wider text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/20">
            {t("trend_matrix", activeLang)}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-orca-darkest/60 border border-white/[0.06] text-xs text-slate-300 leading-relaxed flex items-start gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-white font-semibold mr-1.5">{t("conclusion_label", activeLang)}</span>
            <span>{conclusion}</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-white/[0.06] bg-orca-darkest/50">
          <table className="w-full text-xs text-left">
            <thead className="text-[10px] font-mono tabular-nums uppercase tracking-wider text-slate-400 bg-white/[0.02] border-b border-white/[0.06]">
              <tr>
                <th className="py-2 px-3">{t("metric", activeLang)}</th>
                <th className="py-2 px-3 font-mono tabular-nums">Earlier ({firstPt?.timestamp.slice(0, 10)})</th>
                <th className="py-2 px-3 font-mono tabular-nums">Recent ({lastPt?.timestamp.slice(0, 10)})</th>
                <th className="py-2 px-3 font-mono tabular-nums">{t("net_change", activeLang)}</th>
                <th className="py-2 px-3 text-right">{t("significance", activeLang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {firstPt && lastPt && (
                <>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2 px-3 font-medium text-white">{localizeLabel("Significant Wave Height", activeLang)}</td>
                    <td className="py-2 px-3 font-mono tabular-nums text-slate-300">{firstPt.wave_height_m} m</td>
                    <td className="py-2 px-3 font-mono tabular-nums text-slate-300">{lastPt.wave_height_m} m</td>
                    <td className="py-2 px-3 font-mono tabular-nums">
                      {(lastPt.wave_height_m - firstPt.wave_height_m).toFixed(2)} m
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-300">
                      {lastPt.wave_height_m > firstPt.wave_height_m ? "Increasing" : "Subsided"}
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2 px-3 font-medium text-white">{localizeLabel("Wind Speed & Gusts", activeLang)}</td>
                    <td className="py-2 px-3 font-mono tabular-nums text-slate-300">{firstPt.wind_knots} kt</td>
                    <td className="py-2 px-3 font-mono tabular-nums text-slate-300">{lastPt.wind_knots} kt</td>
                    <td className="py-2 px-3 font-mono tabular-nums">
                      {(lastPt.wind_knots - firstPt.wind_knots).toFixed(1)} kt
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-300">
                      {lastPt.wind_knots > firstPt.wind_knots ? "Accelerating" : "Decreasing"}
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2 px-3 font-medium text-white">{localizeLabel("Sea Surface Temperature", activeLang)}</td>
                    <td className="py-2 px-3 font-mono tabular-nums text-slate-300">{firstPt.sst_c}°C</td>
                    <td className="py-2 px-3 font-mono tabular-nums text-slate-300">{lastPt.sst_c}°C</td>
                    <td className="py-2 px-3 font-mono tabular-nums">
                      {(lastPt.sst_c - firstPt.sst_c).toFixed(1)}°C
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-300">Thermal Shift</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2 px-3 font-medium text-white">{localizeLabel("Marine Risk", activeLang)}</td>
                    <td className="py-2 px-3 font-mono tabular-nums text-slate-300">{firstPt.risk_score}/100</td>
                    <td className="py-2 px-3 font-mono tabular-nums text-slate-300">{lastPt.risk_score}/100</td>
                    <td className="py-2 px-3 font-mono tabular-nums">
                      {lastPt.risk_score - firstPt.risk_score} pts
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-300">
                      {lastPt.risk_score > firstPt.risk_score ? "Elevating Risk" : "Stable/Declining"}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // 6. DEFAULT: MARINE SAFETY / CONDITIONS SUMMARY TABLE
  // ────────────────────────────────────────────────────────────
  const ocean = analysis.ocean_conditions;
  const weather = analysis.weather_conditions;
  const risk = analysis.risk_assessment;
  // Primary signal comes from answer.verdict / risk.band (contract 1.3.0), never prose.
  const envAny = analysis as any;
  const vt = envAny.answer?.verdict ? verdictTone(envAny.answer.verdict) : null;
  const envBand: string | undefined = envAny.risk?.band ?? risk?.category;
  const envScore: number | undefined = typeof envAny.risk?.score === "number" ? envAny.risk.score : risk?.overall_score;
  const bt = envBand ? bandTone(envBand) : null;
  const conclusion =
    (activeLang !== "en" && analysis.recommendation ? analysis.recommendation : null) ||
    envAny.answer?.narrative ||
    analysis.recommendation ||
    analysis.executive_summary;

  return (
    <div className="pt-2 pb-1 space-y-2.5">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span className="text-[11px] font-mono tabular-nums font-bold uppercase tracking-wider text-slate-200">
            {t("final_decision_summary", activeLang)}
          </span>
        </div>
        <span className="text-[10px] font-mono tabular-nums uppercase tracking-wider text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
          {t("env_matrix", activeLang)}
        </span>
      </div>

      <div className="p-2.5 rounded-lg bg-orca-darkest/60 border border-white/[0.06] text-xs text-slate-300 leading-relaxed flex items-start gap-2">
        <Waves className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          {(vt || bt) && (
            <div className={`flex items-center gap-2 mb-1 ${NUM}`}>
              {vt && <span className="text-[13px] font-bold" style={{ color: vt.hex }}>{vt.word}</span>}
              {bt && <span className="text-[11px] font-semibold" style={{ color: bt.hex }}>{bt.word}{typeof envScore === "number" ? ` · ${envScore}/100` : ""}</span>}
            </div>
          )}
          <span className="text-white font-semibold mr-1.5">{t("conclusion_label", activeLang)}</span>
          <span className="text-slate-400">{conclusion}</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/[0.06] bg-orca-darkest/50">
        <table className="w-full text-xs text-left">
          <thead className="text-[10px] font-mono tabular-nums uppercase tracking-wider text-slate-400 bg-white/[0.02] border-b border-white/[0.06]">
            <tr>
              <th className="py-2 px-3">{t("condition_param", activeLang)}</th>
              <th className="py-2 px-3 font-mono tabular-nums">{t("value", activeLang)}</th>
              <th className="py-2 px-3 text-right">{t("severity_interp", activeLang)}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {risk && (
              <tr className="hover:bg-white/[0.02] transition-colors bg-white/[0.01]">
                <td className="py-2 px-3 font-semibold text-white">{localizeLabel("Overall Marine Hazard", activeLang)}</td>
                <td className="py-2 px-3 font-mono tabular-nums font-bold">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] border ${
                      risk.category === "LOW"
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : risk.category === "MODERATE"
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                    }`}
                  >
                    {(envBand || risk.category)} RISK · {envScore ?? risk.overall_score}/100
                  </span>
                </td>
                <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-300">
                  {localizeLabel(
                    risk.category === "LOW"
                      ? "Safe for Normal Navigation"
                      : risk.category === "MODERATE"
                      ? "Exercise Caution — Swell & Wind Monitored"
                      : "Severe Sea State — Delay Departure",
                    activeLang
                  )}
                </td>
              </tr>
            )}

            {ocean && (
              <>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 px-3 text-white font-medium">{localizeLabel("Significant Wave Height", activeLang)}</td>
                  <td className="py-2 px-3 font-mono tabular-nums text-slate-200">{ocean.significant_wave_height_m} m</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-300">
                    {localizeLabel(
                      ocean.sea_state ||
                        (ocean.significant_wave_height_m <= 1.5
                          ? "Calm / Slight Sea"
                          : ocean.significant_wave_height_m <= 2.5
                          ? "Moderate Sea State"
                          : "Rough Sea State"),
                      activeLang
                    )}
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 px-3 text-white font-medium">{localizeLabel("Swell Wave Height", activeLang)}</td>
                  <td className="py-2 px-3 font-mono tabular-nums text-slate-200">
                    {ocean.swell_height_m} m ({ocean.swell_period_sec}s period)
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-300">
                    Bearing: {ocean.swell_direction_deg}° Azimuth
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 px-3 text-white font-medium">{localizeLabel("Sea Surface Temperature", activeLang)}</td>
                  <td className="py-2 px-3 font-mono tabular-nums text-slate-200">{ocean.sea_surface_temp_c}°C</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-300">
                    {localizeLabel(
                      ocean.sea_surface_temp_c >= 27 && ocean.sea_surface_temp_c <= 30
                        ? "Normal Tropical Thermal Range"
                        : "Monitored Sea Temperature",
                      activeLang
                    )}
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 px-3 text-white font-medium">{localizeLabel("Ocean Surface Current", activeLang)}</td>
                  <td className="py-2 px-3 font-mono tabular-nums text-slate-200">{ocean.ocean_current_speed_m_s} m/s</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-300">
                    Drift: {ocean.ocean_current_direction_deg}° Azimuth
                  </td>
                </tr>
              </>
            )}

            {weather && (
              <>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 px-3 text-white font-medium">{localizeLabel("Wind Speed & Gusts", activeLang)}</td>
                  <td className="py-2 px-3 font-mono tabular-nums text-slate-200">
                    {weather.wind_speed_knots} kt (Gusts: {weather.wind_gust_knots} kt)
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-300">
                    {weather.alert_level} · Vector {weather.wind_direction_deg}°
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 px-3 text-white font-medium">{localizeLabel("Atmospheric Visibility", activeLang)}</td>
                  <td className="py-2 px-3 font-mono tabular-nums text-slate-200">{weather.visibility_km} km</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-300">
                    {localizeLabel(
                      weather.visibility_km >= 8 ? "Clear Navigational Sight" : "Restricted Visibility",
                      activeLang
                    )}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

