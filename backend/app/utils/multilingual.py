import re
from typing import Tuple, Dict, Any

LANGUAGE_CODES = {
    "en": "English",
    "te": "Telugu (తెలుగు)",
    "hi": "Hindi (हिन्दी)",
    "ta": "Tamil (தமிழ்)",
    "kn": "Kannada (ಕನ್ನಡ)",
    "ml": "Malayalam (മലയാളം)",
    "mr": "Marathi (मराठी)",
    "bn": "Bengali (বাংলা)",
    "gu": "Gujarati (ગુજરાતી)",
    "or": "Odia (ଓଡ଼ିଆ)",
}

# "Not available", per language. A template renders the computed value or this
# word. It never renders a stand-in number that reads like a measurement.
UNAVAILABLE = {
    "te": "అందుబాటులో లేదు", "hi": "उपलब्ध नहीं", "ta": "கிடைக்கவில்லை", "kn": "ಲಭ್ಯವಿಲ್ಲ",
    "ml": "ലഭ്യമല്ല", "mr": "उपलब्ध नाही", "bn": "উপলব্ধ নয়", "gu": "ઉપલબ્ધ નથી", "or": "ଉପଲବ୍ଧ ନାହିଁ",
}

# Whether the recommended corridor clears a named protected area, or no
# protected area lies on it. Filled from the route the vessel agent computed.
MPA_CLAUSE = {
    "te": ("ఈ మార్గం {names} ను పూర్తిగా తప్పిస్తుంది.", "ఈ మార్గంలో సంరక్షిత సముద్ర ప్రాంతాలు లేవు."),
    "hi": ("यह मार्ग {names} से पूरी तरह बाहर रहता है।", "इस मार्ग पर कोई संरक्षित समुद्री क्षेत्र नहीं है।"),
    "ta": ("இந்த பாதை {names} ஐ முழுமையாக தவிர்க்கிறது.", "இந்த பாதையில் பாதுகாக்கப்பட்ட கடல் பகுதிகள் இல்லை."),
    "ml": ("ഈ റൂട്ട് {names} പൂർണ്ണമായും ഒഴിവാക്കുന്നു.", "ഈ റൂട്ടിൽ സംരക്ഷിത സമുദ്ര മേഖലകളില്ല."),
    "kn": ("ಈ ಮಾರ್ಗವು {names} ಅನ್ನು ಸಂಪೂರ್ಣವಾಗಿ ತಪ್ಪಿಸುತ್ತದೆ.", "ಈ ಮಾರ್ಗದಲ್ಲಿ ಸಂರಕ್ಷಿತ ಸಮುದ್ರ ಪ್ರದೇಶಗಳಿಲ್ಲ."),
    "bn": ("এই রুটটি {names} সম্পূর্ণভাবে এড়িয়ে চলে।", "এই রুটে কোনো সংরক্ষিত সমুদ্র অঞ্চল নেই।"),
    "mr": ("हा मार्ग {names} पूर्णपणे टाळतो.", "या मार्गावर कोणतेही संरक्षित सागरी क्षेत्र नाही."),
}


def _num(value, lang: str, digits: int = 1) -> str:
    """Format a computed number, or say it is unavailable in the user's language."""
    if value is None:
        return UNAVAILABLE.get(lang, "n/a")
    return f"{value:.{digits}f}"


def _mpa_clause(lang: str, avoided) -> str:
    avoids, none = MPA_CLAUSE[lang]
    return avoids.format(names=", ".join(avoided)) if avoided else none


# Domain vocabulary for synthesis across Indian coastal languages
MARINE_VOCAB = {
    "te": {
        "safety_title": "సముద్ర భద్రతా అంచనా",
        "low_risk": "తక్కువ ప్రమాదం (సురక్షితమైనది)",
        "mod_risk": "మధ్యస్థ ప్రమాదం (జాగ్రత్త అవసరం)",
        "high_risk": "అధిక ప్రమాదం (ప్రమాదకరం)",
        "severe_risk": "తీవ్రమైన ప్రమాదం (సముద్రంలోకి వెళ్లవద్దు)",
        "rec_safe": "వాతావరణం మరియు సముద్ర పరిస్థితులు ప్రస్తుతం అనుకూలంగా ఉన్నాయి. సాధారణ భద్రతా జాగ్రత్తలు పాటిస్తూ చేపల వేటకు వెళ్ళవచ్చు.",
        "rec_unfavorable": "అధిక అలల ఎత్తు మరియు తీవ్రమైన గాలుల కారణంగా ఈ సమయంలో చేపల వేటకు వెళ్లడం సురక్షితం కాదు. తీరంలోనే ఉండడం మంచిది.",
        "pfz_title": "అనుకూల చేపల వేట ప్రాంతాలు (PFZ)",
        "wave_label": "అలల ఎత్తు",
        "wind_label": "గాలి వేగం",
        "sst_label": "సముద్ర ఉపరితల ఉష్ణోగ్రత",
        "advisory_label": "హెచ్చరిక"
    },
    "hi": {
        "safety_title": "समुद्री सुरक्षा मूल्यांकन",
        "low_risk": "कम जोखिम (अनुकूल)",
        "mod_risk": "मध्यम जोखिम (सावधानी आवश्यक)",
        "high_risk": "उच्च जोखिम (खतरनाक)",
        "severe_risk": "गंभीर जोखिम (समुद्र में न जाएं)",
        "rec_safe": "वर्तमान में मौसम और समुद्र की स्थिति अनुकूल है। सामान्य सावधानियों के साथ मत्स्य पालन जारी रखा जा सकता है।",
        "rec_unfavorable": "उच्च लहरों और तेज हवाओं के कारण समुद्र में जाना असुरक्षित है। कृपया किनारे पर ही सुरक्षित रहें।",
        "pfz_title": "संभावित मत्स्य पालन क्षेत्र (PFZ)",
        "wave_label": "लहर की ऊंचाई",
        "wind_label": "हवा की गति",
        "sst_label": "समुद्र सतह तापमान",
        "advisory_label": "चेतावनी"
    },
    "ta": {
        "safety_title": "கடல் பாதுகாப்பு மதிப்பீடு",
        "low_risk": "குறைந்த ஆபத்து (பாதுகாப்பானது)",
        "mod_risk": "நடுத்தர ஆபத்து (எச்சரிக்கை தேவை)",
        "high_risk": "அதிக ஆபத்து (ஆபத்தானது)",
        "severe_risk": "கடுமையான ஆபத்து (கடலுக்கு செல்ல வேண்டாம்)",
        "rec_safe": "தற்போதைய கடல் மற்றும் வானிலை நிலைமைகள் சாதகமாக உள்ளன. பாதுகாப்பு விதிகளுடன் மீன்பிடிக்க செல்லலாம்.",
        "rec_unfavorable": "உயர்ந்த அலைகள் மற்றும் பலத்த காற்று காரணமாக கடலுக்கு செல்வது பாதுகாப்பற்றது. கரையிலேயே இருப்பது நல்லது.",
        "pfz_title": "சாத்தியமான மீன்பிடி மண்டலங்கள் (PFZ)",
        "wave_label": "அலை உயரம்",
        "wind_label": "காற்றின் வேகம்",
        "sst_label": "கடல் மேற்பரப்பு வெப்பநிலை",
        "advisory_label": "எச்சரிக்கை"
    },
    "kn": {
        "safety_title": "ಸಮುದ್ರ ಸುರಕ್ಷತಾ ಮೌಲ್ಯಮಾಪನ",
        "low_risk": "ಕಡಿಮೆ ಅಪಾಯ (ಸುರಕ್ಷಿತ)",
        "mod_risk": "ಮಧ್ಯಮ ಅಪಾಯ (ಎಚ್ಚರಿಕೆ ಅಗತ್ಯ)",
        "high_risk": "ಹೆಚ್ಚಿನ ಅಪಾಯ (ಅಪಾಯಕಾರಿ)",
        "severe_risk": "ತೀವ್ರ ಅಪಾಯ (ಸಮುದ್ರಕ್ಕೆ ಇಳಿಯಬೇಡಿ)",
        "rec_safe": "ಪ್ರಸ್ತುತ ಹವಾಮಾನ ಮತ್ತು ಸಮುದ್ರ ಪರಿಸ್ಥಿತಿಗಳು ಅನುಕೂಲಕರವಾಗಿವೆ.",
        "rec_unfavorable": "ಅಧಿಕ ಅಲೆಗಳ ಎತ್ತರ ಮತ್ತು ಬಿರುಗಾಳಿಯ ಕಾರಣ ಸಮುದ್ರಯಾನ ಸುರಕ್ಷಿತವಲ್ಲ.",
        "pfz_title": "ಸಂಭಾವ್ಯ ಮೀನುಗಾರಿಕೆ ವಲಯಗಳು",
        "wave_label": "ಅಲೆಗಳ ಎತ್ತರ",
        "wind_label": "ಗಾಳಿಯ ವೇಗ",
        "sst_label": "ಸಮುದ್ರದ ತಾಪಮಾನ",
        "advisory_label": "ಎಚ್ಚರಿಕೆ"
    },
    "ml": {
        "safety_title": "സമുദ്ര സുരക്ഷാ വിലയിരുത്തൽ",
        "low_risk": "കുറഞ്ഞ അപകടസാധ്യത (സുരക്ഷിതം)",
        "mod_risk": "മിതമായ അപകടസാധ്യത (ജാഗ്രത പാലിക്കുക)",
        "high_risk": "ഉയർന്ന അപകടസാധ്യത (അപകടകരം)",
        "severe_risk": "ഗുരുതരമായ അപകടസാധ്യത (കടലിൽ പോകരുത്)",
        "rec_safe": "കടൽ കാലാവസ്ഥ അനുകൂലമാണ്. മത്സ്യബന്ധനത്തിന് പോകാവുന്നതാണ്.",
        "rec_unfavorable": "ഉയർന്ന തിരമാലകളും ശക്തമായ കാറ്റും കാരണം കടലിൽ പോകുന്നത് സുരക്ഷിതമല്ല.",
        "pfz_title": "സാധ്യതയുള്ള മത്സ്യബന്ധന മേഖലകൾ",
        "wave_label": "തിരമാല ഉയരം",
        "wind_label": "കാറ്റിന്റെ വേഗത",
        "sst_label": "സമുദ്രോപരിതല താപനില",
        "advisory_label": "മുന്നറിയിപ്പ്"
    },
    "mr": {
        "safety_title": "सागरी सुरक्षा मूल्यांकन",
        "low_risk": "कमी धोका (सुरक्षित)",
        "mod_risk": "मध्यम धोका (काळजी घ्या)",
        "high_risk": "उच्च धोका (धोकादायक)",
        "severe_risk": "गंभीर धोका (समुद्रात जाऊ नका)",
        "rec_safe": "सध्या हवामान आणि सागरी परिस्थिती मासेमारीसाठी अनुकूल आहे.",
        "rec_unfavorable": "उंच लाटा आणि जोरदार वाऱ्यामुळे समुद्रात जाणे असुरक्षित आहे.",
        "pfz_title": "संभाव्य मासेमारी क्षेत्रे",
        "wave_label": "लाटांची उंची",
        "wind_label": "वाऱ्याचा वेग",
        "sst_label": "सागरी पृष्ठभागाचे तापमान",
        "advisory_label": "इशारा"
    },
    "bn": {
        "safety_title": "সামুদ্রিক নিরাপত্তা মূল্যায়ন",
        "low_risk": "কম ঝুঁকি (নিরাপদ)",
        "mod_risk": "মাঝারি ঝুঁকি (সতর্কতা প্রয়োজন)",
        "high_risk": "উচ্চ ঝুঁকি (বিপজ্জনক)",
        "severe_risk": "মারাত্মক ঝুঁকি (সমুদ্রে যাবেন না)",
        "rec_safe": "বর্তমান আবহাওয়া ও সমুদ্রের পরিস্থিতি মাছ ধরার জন্য অনুকূল।",
        "rec_unfavorable": "উঁচু ঢেউ এবং তীব্র বাতাসের কারণে সমুদ্রে যাওয়া অনিরাপদ।",
        "pfz_title": "সম্ভাব্য মৎস্য আহরণ ক্ষেত্র",
        "wave_label": "ঢেউয়ের উচ্চতা",
        "wind_label": "বাতাসের গতি",
        "sst_label": "সমুদ্র পৃষ্ঠের তাপমাত্রা",
        "advisory_label": "সতর্কবার্তা"
    },
    "gu": {
        "safety_title": "દરિયાઈ સલામતી મૂલ્યાંકન",
        "low_risk": "ઓછું જોખમ (સલામત)",
        "mod_risk": "મધ્યમ જોખમ (સાવચેતી જરૂરી)",
        "high_risk": "ઉચ્ચ જોખમ (જોખમી)",
        "severe_risk": "ગંભીર જોખમ (દરિયામાં ન જવું)",
        "rec_safe": "હાલમાં હવામાન અને દરિયાની સ્થિતિ માછીમારી માટે અનુકૂળ છે.",
        "rec_unfavorable": "ઊંચા મોજા અને ભારે પવનને કારણે દરિયામાં જવું અસુરક્ષિત છે.",
        "pfz_title": "સંભવિત મત્સ્યોદ્યોગ ઝોન",
        "wave_label": "મોજાંની ઊંચાઈ",
        "wind_label": "પવનની ગતિ",
        "sst_label": "સપાટીનું તાપમાન",
        "advisory_label": "ચેતવણી"
    },
    "or": {
        "safety_title": "ସାମୁଦ୍ରିକ ସୁରକ୍ଷା ମୂଲ୍ୟାଙ୍କନ",
        "low_risk": "କମ ବିପଦ (ସୁରକ୍ଷିତ)",
        "mod_risk": "ମଧ୍ୟମ ବିପଦ (ସତର୍କତା ଆବଶ୍ୟକ)",
        "high_risk": "ଉଚ୍ଚ ବିପଦ (ବିପଦପୂର୍ଣ୍ଣ)",
        "severe_risk": "ଗମ୍ଭୀର ବିପଦ (ସମୁଦ୍ରକୁ ଯାଆନ୍ତୁ ନାହିଁ)",
        "rec_safe": "ସାମ୍ପ୍ରତିକ ପାଣିପାଗ ଓ ସମୁଦ୍ର ସ୍ଥିତି ମାଛ ଧରିବା ପାଇଁ ଅନୁକୂଳ ଅଟେ।",
        "rec_unfavorable": "ଉଚ୍ଚ ଢେଉ ଏବଂ ପ୍ରବଳ ପବନ କାରଣରୁ ସମୁଦ୍ର ଯାତ୍ରା ସୁରକ୍ଷିତ ନୁହେଁ।",
        "pfz_title": "ସମ୍ଭାବ୍ୟ ମତ୍ସ୍ୟ ଶିକାର କ୍ଷେତ୍ର",
        "wave_label": "ଢେଉର ଉଚ୍ଚତା",
        "wind_label": "ପବନର ବେଗ",
        "sst_label": "ସମୁଦ୍ର ତାପମାତ୍ରା",
        "advisory_label": "ଚେତାବନୀ"
    }
}


# --- Band-keyed advisory ----------------------------------------------------
#
# The advisory a user reads is derived from the risk band the deterministic
# engine produced, here, once, for every language including English. It used to
# be a two-state safe/unsafe ladder over four bands, so a MODERATE (CAUTION)
# verdict rendered as "conditions are favourable, go fishing" in every
# vernacular while English correctly said "stay in sheltered water".
#
# Every band maps to its own text in every language. Nothing collapses.

# The engine's band -> the already-translated band label in MARINE_VOCAB.
# MARINE_VOCAB spells moderate "mod_risk", so a f"{band.lower()}_risk" lookup
# missed it and leaked the English enum into vernacular sentences.
BAND_LABEL_KEY = {
    "LOW": "low_risk",
    "MODERATE": "mod_risk",
    "HIGH": "high_risk",
    "SEVERE": "severe_risk",
}

# Appended to every advisory so the computed values reach the reader in their
# own language instead of being dropped on the vernacular path.
VALUES_CLAUSE = {
    "en": "Waves {wave} m · wind {wind} kt · {horizon}.",
    "te": "అలలు {wave} మీ · గాలి {wind} నాట్ · {horizon}.",
    "hi": "लहरें {wave} मी · हवा {wind} नॉट · {horizon}।",
    "ta": "அலைகள் {wave} மீ · காற்று {wind} நாட் · {horizon}.",
    "kn": "ಅಲೆಗಳು {wave} ಮೀ · ಗಾಳಿ {wind} ನಾಟ್ · {horizon}.",
    "ml": "തിരമാല {wave} മീ · കാറ്റ് {wind} നോട്ട് · {horizon}.",
    "mr": "लाटा {wave} मी · वारा {wind} नॉट · {horizon}.",
    "bn": "ঢেউ {wave} মি · বাতাস {wind} নট · {horizon}।",
    "gu": "મોજાં {wave} મી · પવન {wind} નોટ · {horizon}.",
    "or": "ଢେଉ {wave} ମି · ପବନ {wind} ନଟ୍ · {horizon}।",
}

# Four distinct advisories per language. LOW and HIGH reuse the wording the
# team already had (rec_safe / rec_unfavorable); MODERATE and SEVERE are the
# two that never existed and whose absence caused the inversion.
BAND_ADVISORY = {
    "en": {
        "LOW": "GO: conditions are favorable for fishing craft and coastal navigation. "
               "Maintain standard coastal safety protocols, monitor local marine broadcasts or NavIC advisories, and respect boundary geofences.",
        "MODERATE": "CAUTION: conditions are marginal. Small artisanal craft should stay within sheltered coastal waters, "
                    "carry communication equipment, and turn back if the sea state worsens.",
        "HIGH": "NO-GO: high wave energy and squally winds present hazardous sea conditions for small artisanal vessels. "
                "Fishermen are advised to postpone offshore departure or remain within sheltered harbor waters.",
        "SEVERE": "NO-GO: severe sea state. Do not depart under any circumstances. "
                  "Vessels already at sea should return to the nearest harbour immediately.",
    },
    "te": {
        "LOW": "వాతావరణం మరియు సముద్ర పరిస్థితులు ప్రస్తుతం అనుకూలంగా ఉన్నాయి. సాధారణ భద్రతా జాగ్రత్తలు పాటిస్తూ చేపల వేటకు వెళ్ళవచ్చు.",
        "MODERATE": "పరిస్థితులు అంతంతమాత్రంగా ఉన్నాయి. చిన్న పడవలు తీరానికి దగ్గరగా ఉండాలి, రేడియో లేదా ఫోన్ తీసుకెళ్లాలి, సముద్రం మరింత అల్లకల్లోలంగా మారితే వెంటనే తిరిగి రావాలి.",
        "HIGH": "అధిక అలల ఎత్తు మరియు తీవ్రమైన గాలుల కారణంగా ఈ సమయంలో చేపల వేటకు వెళ్లడం సురక్షితం కాదు. తీరంలోనే ఉండడం మంచిది.",
        "SEVERE": "సముద్రంలోకి వెళ్లవద్దు. సముద్రంలో ఉన్న పడవలు వెంటనే దగ్గరి రేవుకు తిరిగి రావాలి.",
    },
    "hi": {
        "LOW": "वर्तमान में मौसम और समुद्र की स्थिति अनुकूल है। सामान्य सावधानियों के साथ मत्स्य पालन जारी रखा जा सकता है।",
        "MODERATE": "स्थितियाँ अनुकूल नहीं हैं। छोटी नावें तट के पास ही रहें, रेडियो या फ़ोन साथ रखें, और समुद्र बिगड़ने पर तुरंत लौट आएँ।",
        "HIGH": "ऊँची लहरों और तेज़ हवाओं के कारण इस समय समुद्र में जाना सुरक्षित नहीं है। तट पर ही रहें।",
        "SEVERE": "समुद्र में न जाएँ। समुद्र में मौजूद नावें तुरंत निकटतम बंदरगाह लौटें।",
    },
    "ta": {
        "LOW": "தற்போதைய கடல் மற்றும் வானிலை நிலைமைகள் சாதகமாக உள்ளன. பாதுகாப்பு விதிகளுடன் மீன்பிடிக்க செல்லலாம்.",
        "MODERATE": "நிலைமைகள் சாதகமற்றவை. சிறு படகுகள் கரைக்கு அருகில் இருக்க வேண்டும், வானொலி அல்லது தொலைபேசி எடுத்துச் செல்ல வேண்டும், கடல் மோசமானால் உடனே திரும்ப வேண்டும்.",
        "HIGH": "உயர்ந்த அலைகள் மற்றும் பலத்த காற்று காரணமாக இப்போது கடலுக்குச் செல்வது பாதுகாப்பானது அல்ல. கரையிலேயே இருங்கள்.",
        "SEVERE": "கடலுக்குச் செல்ல வேண்டாம். கடலில் உள்ள படகுகள் உடனடியாக அருகிலுள்ள துறைமுகத்திற்குத் திரும்ப வேண்டும்.",
    },
    "kn": {
        "LOW": "ಪ್ರಸ್ತುತ ಹವಾಮಾನ ಮತ್ತು ಸಮುದ್ರ ಪರಿಸ್ಥಿತಿಗಳು ಅನುಕೂಲಕರವಾಗಿವೆ.",
        "MODERATE": "ಪರಿಸ್ಥಿತಿಗಳು ಅನುಕೂಲಕರವಾಗಿಲ್ಲ. ಸಣ್ಣ ದೋಣಿಗಳು ದಡದ ಸಮೀಪವೇ ಇರಬೇಕು, ರೇಡಿಯೋ ಅಥವಾ ಫೋನ್ ಒಯ್ಯಬೇಕು, ಸಮುದ್ರ ಹದಗೆಟ್ಟರೆ ಕೂಡಲೇ ಹಿಂತಿರುಗಬೇಕು.",
        "HIGH": "ಎತ್ತರದ ಅಲೆಗಳು ಮತ್ತು ಬಿರುಗಾಳಿಯಿಂದಾಗಿ ಈಗ ಸಮುದ್ರಕ್ಕೆ ಹೋಗುವುದು ಸುರಕ್ಷಿತವಲ್ಲ. ದಡದಲ್ಲಿಯೇ ಇರಿ.",
        "SEVERE": "ಸಮುದ್ರಕ್ಕೆ ಹೋಗಬೇಡಿ. ಸಮುದ್ರದಲ್ಲಿರುವ ದೋಣಿಗಳು ಕೂಡಲೇ ಹತ್ತಿರದ ಬಂದರಿಗೆ ಮರಳಬೇಕು.",
    },
    "ml": {
        "LOW": "കടൽ കാലാവസ്ഥ അനുകൂലമാണ്. മത്സ്യബന്ധനത്തിന് പോകാവുന്നതാണ്.",
        "MODERATE": "സാഹചര്യങ്ങൾ അനുകൂലമല്ല. ചെറുവള്ളങ്ങൾ തീരത്തിനടുത്ത് നിൽക്കണം, റേഡിയോ അല്ലെങ്കിൽ ഫോൺ കൊണ്ടുപോകണം, കടൽ മോശമായാൽ ഉടൻ മടങ്ങണം.",
        "HIGH": "ഉയർന്ന തിരമാലയും ശക്തമായ കാറ്റും കാരണം ഇപ്പോൾ കടലിൽ പോകുന്നത് സുരക്ഷിതമല്ല. തീരത്ത് തന്നെ തുടരുക.",
        "SEVERE": "കടലിൽ പോകരുത്. കടലിലുള്ള വള്ളങ്ങൾ ഉടൻ അടുത്ത തുറമുഖത്തേക്ക് മടങ്ങണം.",
    },
    "mr": {
        "LOW": "सध्या हवामान आणि सागरी परिस्थिती मासेमारीसाठी अनुकूल आहे.",
        "MODERATE": "परिस्थिती अनुकूल नाही. लहान नौकांनी किनाऱ्याजवळच राहावे, रेडिओ किंवा फोन सोबत ठेवावा, आणि समुद्र बिघडल्यास लगेच परत यावे.",
        "HIGH": "उंच लाटा आणि जोरदार वाऱ्यामुळे सध्या समुद्रात जाणे सुरक्षित नाही. किनाऱ्यावरच रहा.",
        "SEVERE": "समुद्रात जाऊ नका. समुद्रातील नौकांनी तात्काळ जवळच्या बंदरात परतावे.",
    },
    "bn": {
        "LOW": "বর্তমান আবহাওয়া ও সমুদ্রের পরিস্থিতি মাছ ধরার জন্য অনুকূল।",
        "MODERATE": "পরিস্থিতি অনুকূল নয়। ছোট নৌকা তীরের কাছে থাকুক, রেডিও বা ফোন সঙ্গে রাখুন, এবং সমুদ্র খারাপ হলে সঙ্গে সঙ্গে ফিরে আসুন।",
        "HIGH": "উঁচু ঢেউ ও ঝোড়ো বাতাসের কারণে এখন সমুদ্রে যাওয়া নিরাপদ নয়। তীরেই থাকুন।",
        "SEVERE": "সমুদ্রে যাবেন না। সমুদ্রে থাকা নৌকা অবিলম্বে নিকটতম বন্দরে ফিরে আসুক।",
    },
    "gu": {
        "LOW": "હાલમાં હવામાન અને દરિયાની સ્થિતિ માછીમારી માટે અનુકૂળ છે.",
        "MODERATE": "પરિસ્થિતિ અનુકૂળ નથી. નાની હોડીઓ કિનારા નજીક રહે, રેડિયો કે ફોન સાથે રાખો, અને દરિયો બગડે તો તરત પાછા ફરો.",
        "HIGH": "ઊંચા મોજાં અને તેજ પવનના કારણે અત્યારે દરિયામાં જવું સલામત નથી. કિનારે જ રહો.",
        "SEVERE": "દરિયામાં ન જાઓ. દરિયામાં રહેલી હોડીઓ તરત નજીકના બંદરે પાછી ફરે.",
    },
    "or": {
        "LOW": "ସାମ୍ପ୍ରତିକ ପାଣିପାଗ ଓ ସମୁଦ୍ର ସ୍ଥିତି ମାଛ ଧରିବା ପାଇଁ ଅନୁକୂଳ ଅଟେ।",
        "MODERATE": "ପରିସ୍ଥିତି ଅନୁକୂଳ ନୁହେଁ। ଛୋଟ ଡଙ୍ଗା କୂଳ ପାଖରେ ରୁହନ୍ତୁ, ରେଡିଓ କିମ୍ବା ଫୋନ୍ ସାଙ୍ଗରେ ରଖନ୍ତୁ, ଏବଂ ସମୁଦ୍ର ଖରାପ ହେଲେ ତୁରନ୍ତ ଫେରି ଆସନ୍ତୁ।",
        "HIGH": "ଉଚ୍ଚ ଢେଉ ଓ ପ୍ରବଳ ପବନ ଯୋଗୁଁ ବର୍ତ୍ତମାନ ସମୁଦ୍ରକୁ ଯିବା ନିରାପଦ ନୁହେଁ। କୂଳରେ ହିଁ ରୁହନ୍ତୁ।",
        "SEVERE": "ସମୁଦ୍ରକୁ ଯାଆନ୍ତୁ ନାହିଁ। ସମୁଦ୍ରରେ ଥିବା ଡଙ୍ଗା ତୁରନ୍ତ ନିକଟସ୍ଥ ବନ୍ଦରକୁ ଫେରି ଆସନ୍ତୁ।",
    },
}

# Said in the reader's own language when we hold no advisory for their language.
# Never silently downgrade to a milder band: say the text is English and show it.
UNTRANSLATED_NOTICE = {
    "te": "(ఈ సలహా మీ భాషలో అందుబాటులో లేదు — ఆంగ్లంలో)",
    "hi": "(यह सलाह आपकी भाषा में उपलब्ध नहीं है — अंग्रेज़ी में)",
    "ta": "(இந்த அறிவுரை உங்கள் மொழியில் இல்லை — ஆங்கிலத்தில்)",
    "kn": "(ಈ ಸಲಹೆ ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ — ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ)",
    "ml": "(ഈ ഉപദേശം നിങ്ങളുടെ ഭാഷയിൽ ലഭ്യമല്ല — ഇംഗ്ലീഷിൽ)",
    "mr": "(हा सल्ला तुमच्या भाषेत उपलब्ध नाही — इंग्रजीत)",
    "bn": "(এই পরামর্শ আপনার ভাষায় উপলব্ধ নয় — ইংরেজিতে)",
    "gu": "(આ સલાહ તમારી ભાષામાં ઉપલબ્ધ નથી — અંગ્રેજીમાં)",
    "or": "(ଏହି ପରାମର୍ଶ ଆପଣଙ୍କ ଭାଷାରେ ଉପଲବ୍ଧ ନାହିଁ — ଇଂରାଜୀରେ)",
}


def band_label(lang: str, band: str) -> str:
    """The engine's risk band, in the reader's language. Falls back to the band itself."""
    vocab = MARINE_VOCAB.get(lang)
    if not vocab:
        return band
    return vocab.get(BAND_LABEL_KEY.get(band, ""), band)


def advisory_for_band(lang: str, band: str, wave, wind, horizon: str = "") -> str:
    """
    The advisory for one risk band, in one language, with the computed values in it.

    This is the only place an advisory is chosen. `band` is the deterministic
    engine's category, the same one the envelope's verdict is derived from, so
    the advisory a user reads can never disagree with the verdict shown above it.
    """
    band = (band or "").upper()
    wave_s = _num(wave, lang)
    wind_s = _num(wind, lang)

    table = BAND_ADVISORY.get(lang)
    text = table.get(band) if table else None

    if text is None:
        # No text for this language/band. Say so and show English, never a
        # milder band's advisory.
        english = BAND_ADVISORY["en"].get(band, BAND_ADVISORY["en"]["SEVERE"])
        notice = UNTRANSLATED_NOTICE.get(lang)
        text = f"{notice} {english}" if notice else english
        clause = VALUES_CLAUSE["en"]
    else:
        clause = VALUES_CLAUSE.get(lang, VALUES_CLAUSE["en"])

    values = clause.format(wave=wave_s, wind=wind_s, horizon=horizon or "")
    return f"{text} {values}".strip()


def detect_language(query_text: str) -> str:
    """
    Detects language from text script or explicit instruction (e.g. 'in telugu', 'explain in hindi').
    Defaults to 'en' (English).
    """
    text = query_text.lower()

    # 1. Explicit verbal instructions
    if "telugu" in text or "తెలుగు" in text:
        return "te"
    if "hindi" in text or "हिन्दी" in text or "हिंदी" in text:
        return "hi"
    if "tamil" in text or "தமிழ்" in text:
        return "ta"
    if "kannada" in text or "ಕನ್ನಡ" in text:
        return "kn"
    if "malayalam" in text or "മലയാളം" in text:
        return "ml"
    if "marathi" in text or "मराठी" in text:
        return "mr"
    if "bengali" in text or "bangla" in text or "বাংলা" in text:
        return "bn"
    if "gujarati" in text or "ગુજરાતી" in text:
        return "gu"
    if "odia" in text or "oriya" in text or "ଓଡ଼ିଆ" in text:
        return "or"

    # 2. Unicode script detection
    for char in query_text:
        cp = ord(char)
        if 0x0C00 <= cp <= 0x0C7F:
            return "te"  # Telugu
        if 0x0900 <= cp <= 0x097F:
            # Could be Hindi or Marathi; default to Hindi
            return "hi"
        if 0x0B80 <= cp <= 0x0BFF:
            return "ta"  # Tamil
        if 0x0C80 <= cp <= 0x0CFF:
            return "kn"  # Kannada
        if 0x0D00 <= cp <= 0x0D7F:
            return "ml"  # Malayalam
        if 0x0980 <= cp <= 0x09FF:
            return "bn"  # Bengali
        if 0x0A80 <= cp <= 0x0AFF:
            return "gu"  # Gujarati
        if 0x0B00 <= cp <= 0x0B7F:
            return "or"  # Odia

    return "en"

def localize_summary_and_recommendation(
    lang: str,
    risk_category: str,
    location_name: str,
    temporal_label: str,
    english_summary: str,
    english_recommendation: str,
    intent: Any = None,
    route: Any = None,
    pfz_list: Any = None,
    spatial_what_if: Any = None,
    comparison: Any = None,
    ocean: Any = None,
    weather: Any = None,
    query_text: str = ""
) -> Tuple[str, str]:
    """
    Generates localized domain-specific summary and recommendation across supported
    vernacular Indian coastal languages while strictly preserving exact numerical,
    navigational, and scientific values.
    """
    if lang == "en" or lang not in MARINE_VOCAB:
        return english_summary, english_recommendation

    vocab = MARINE_VOCAB[lang]
    # One advisory per band, from the same band the envelope's verdict uses.
    # This was a two-state safe/unsafe ladder, so MODERATE read as "favourable".
    rec_text = advisory_for_band(
        lang,
        risk_category,
        ocean.significant_wave_height_m if ocean else None,
        weather.wind_speed_knots if weather else None,
        temporal_label,
    )

    intent_val = getattr(intent, "value", str(intent)) if intent else ""
    query_lower = query_text.lower() if query_text else ""

    # 1. ROUTE COMPARISON (Two candidate corridors side-by-side)
    if intent_val == "route_comparison" and route and getattr(route, "candidate_routes", None):
        alt_cand = next((c for c in route.candidate_routes if getattr(c, "id", "") == "alternative"), None)
        rec_cand = next((c for c in route.candidate_routes if getattr(c, "id", "") == "recommended"), None)

        if alt_cand and rec_cand:
            diff_km = round(alt_cand.distance_km - rec_cand.distance_km, 1)
            dist_abs = abs(diff_km)
            alt_crosses = bool(alt_cand.crosses_protected_waters)

            if lang == "te":
                summary = (
                    f"రెండు మార్గాల విశ్లేషణ ({alt_cand.name} vs {rec_cand.name}): "
                    f"ప్రత్యామ్నాయ మార్గం {alt_cand.distance_km} కి.మీ ({alt_cand.estimated_transit_hours} గంటల ప్రయాణం, "
                    f"అలల ఎత్తు: {alt_cand.wave_exposure_m}మీ, గాలి: {alt_cand.wind_exposure_knots} నాట్స్) తో {alt_cand.marine_risk.value} ప్రమాదాన్ని కలిగి ఉంది "
                    f"({alt_cand.protected_area_exposure}). "
                    f"సిఫార్సు చేయబడిన సురక్షిత మార్గం {rec_cand.distance_km} కి.మీ ({rec_cand.estimated_transit_hours} గంటల ప్రయాణం, "
                    f"అలల ఎత్తు: {rec_cand.wave_exposure_m}మీ, గాలి: {rec_cand.wind_exposure_knots} నాట్స్) తో {rec_cand.marine_risk.value} ప్రమాదంతో అన్ని అభయారణ్య సరిహద్దులను సురక్షితంగా తప్పిస్తుంది."
                )
                rec = (
                    f"ఆపరేషనల్ ట్రేడ్-ఆఫ్ తీర్పు: ప్రత్యామ్నాయ మార్గం {dist_abs} కి.మీ తక్కువైనప్పటికీ, ఇది {alt_cand.marine_risk.value} ప్రమాదాన్ని కలిగిస్తుంది "
                    + (f"మరియు {', '.join(alt_cand.protected_areas)} పరిధిలోకి ప్రవేశిస్తుంది. " if alt_crosses else "")
                    + f"సిఫార్సు చేయబడిన మార్గం {rec_cand.marine_risk.value} ప్రమాద స్థాయిలో ఉంది. {_mpa_clause('te', alt_cand.protected_areas if alt_crosses else [])}"
                )
                return summary, rec

            elif lang == "hi":
                summary = (
                    f"मार्ग गलियारा तुलना ({alt_cand.name} बनाम {rec_cand.name}): "
                    f"वैकल्पिक गलियारा {alt_cand.distance_km} किमी ({alt_cand.estimated_transit_hours} घंटे का पारगमन, "
                    f"लहर: {alt_cand.wave_exposure_m}मी, हवा: {alt_cand.wind_exposure_knots} समुद्री मील) के साथ {alt_cand.marine_risk.value} जोखिम प्रस्तुत करता है "
                    f"({alt_cand.protected_area_exposure})। "
                    f"अनुशंसित सुरक्षित गलियारा {rec_cand.distance_km} किमी ({rec_cand.estimated_transit_hours} घंटे का पारगमन, "
                    f"लहर: {rec_cand.wave_exposure_m}मी, हवा: {rec_cand.wind_exposure_knots} समुद्री मील) के साथ {rec_cand.marine_risk.value} जोखिम स्तर पर सभी अभयारण्य सीमाओं से सुरक्षित रूप से बाहर है।"
                )
                rec = (
                    f"परिचालन ट्रेड-ऑफ निर्णय: वैकल्पिक मार्ग {dist_abs} किमी छोटा होने के बावजूद {alt_cand.marine_risk.value} जोखिम लाता है "
                    + (f"और {', '.join(alt_cand.protected_areas)} में प्रवेश करता है। " if alt_crosses else "")
                    + f"अनुशंसित गलियारा {rec_cand.marine_risk.value} जोखिम स्तर पर है। {_mpa_clause('hi', alt_cand.protected_areas if alt_crosses else [])}"
                )
                return summary, rec

            elif lang == "ta":
                summary = (
                    f"பாதை ஒப்பீடு ({alt_cand.name} vs {rec_cand.name}): "
                    f"மாற்று பாதை {alt_cand.distance_km} கி.மீ ({alt_cand.estimated_transit_hours} மணிநேரம், அலை: {alt_cand.wave_exposure_m}மீ, காற்று: {alt_cand.wind_exposure_knots} நாட்ஸ்) {alt_cand.marine_risk.value} அபாயத்தைக் கொண்டுள்ளது. "
                    f"பரிந்துரைக்கப்பட்ட பாதுகாப்பான பாதை {rec_cand.distance_km} கி.மீ ({rec_cand.estimated_transit_hours} மணிநேரம்) {rec_cand.marine_risk.value} அபாயத்துடன் சரணாலய எல்லைகளை பாதுகாப்பாக தவிர்க்கிறது."
                )
                rec = f"செயல்பாட்டு தீர்ப்பு: பரிந்துரைக்கப்பட்ட பாதுகாப்பான கடல் பாதையை மட்டுமே தேர்ந்தெடுக்கவும்."
                return summary, rec

            elif lang == "ml":
                summary = (
                    f"റൂട്ട് ഇടനാഴി താരതമ്യം ({alt_cand.name} vs {rec_cand.name}): "
                    f"ബദൽ റൂട്ട് {alt_cand.distance_km} കി.മീ ({alt_cand.estimated_transit_hours} മണിക്കൂർ) {alt_cand.marine_risk.value} അപകടസാധ്യതയുള്ളതാണ്. "
                    f"ശുപാർശ ചെയ്യുന്ന ഇടനാഴി {rec_cand.distance_km} കി.മീ ({rec_cand.estimated_transit_hours} മണിക്കൂർ, {rec_cand.marine_risk.value} അപകടസാധ്യത)."
                )
                rec = f"ശുപാർശ ചെയ്യുന്ന സുരക്ഷിത ഇടനാഴിയിലൂടെ മാത്രം യാത്ര ചെയ്യുക."
                return summary, rec

            elif lang == "kn":
                summary = (
                    f"ಮಾರ್ಗ ಹೋಲಿಕೆ ({alt_cand.name} vs {rec_cand.name}): "
                    f"ಪರ್ಯಾಯ ಮಾರ್ಗ {alt_cand.distance_km} ಕಿ.ಮೀ ({alt_cand.estimated_transit_hours} ಗಂಟೆ) {alt_cand.marine_risk.value} ಅಪಾಯವನ್ನು ಹೊಂದಿದೆ. "
                    f"ಶಿಫಾರಸು ಮಾಡಿದ ಸುರಕ್ಷಿತ ಮಾರ್ಗ {rec_cand.distance_km} ಕಿ.ಮೀ {rec_cand.marine_risk.value} ಅಪಾಯದೊಂದಿಗೆ ಸುರಕ್ಷಿತವಾಗಿದೆ."
                )
                rec = f"ಶಿಫಾರಸು ಮಾಡಿದ ಸುರಕ್ಷಿತ ಮಾರ್ಗವನ್ನು ಮಾತ್ರ ಆಯ್ಕೆಮಾಡಿ."
                return summary, rec

            elif lang == "bn":
                summary = (
                    f"রুট করিডোর তুলনা ({alt_cand.name} বনাম {rec_cand.name}): "
                    f"বিকল্প করিডোর {alt_cand.distance_km} কিমি ({alt_cand.estimated_transit_hours} ঘণ্টা) {alt_cand.marine_risk.value} ঝুঁকিপূর্ণ। "
                    f"সুপারিশকৃত করিডোর {rec_cand.distance_km} কিমি ({rec_cand.marine_risk.value} ঝুঁকি)।"
                )
                rec = f"সুপারিশকৃত নিরাপদ করিডোর ব্যবহার করুন।"
                return summary, rec

            elif lang == "mr":
                summary = (
                    f"मार्ग तुलना ({alt_cand.name} विरुद्ध {rec_cand.name}): "
                    f"पर्यायी मार्ग {alt_cand.distance_km} किमी ({alt_cand.estimated_transit_hours} तास) {alt_cand.marine_risk.value} धोक्याचा आहे. "
                    f"शिफारस केलेला मार्ग {rec_cand.distance_km} किमी ({rec_cand.marine_risk.value} धोका)."
                )
                rec = f"शिफारस केलेल्या सुरक्षित मार्गाने प्रवास करा."
                return summary, rec

    # 2. ROUTE REASONING / RECOMMENDED CORRIDOR FOLLOW-UP
    # Every value below comes from the route the vessel agent computed. A value
    # the route does not carry renders as "unavailable", never as a stand-in.
    if intent_val in ("route_analysis", "route_follow_up") and route and lang in MPA_CLAUSE:
        cands = getattr(route, "candidate_routes", []) or []
        rec_cand = next((c for c in cands if getattr(c, "id", "") == "recommended"), None)
        alt_cand = next((c for c in cands if getattr(c, "id", "") == "alternative"), None)
        orig_name = route.origin.name
        dest_name = route.destination.name
        dist_s = _num(rec_cand.distance_km if rec_cand else route.total_distance_km, lang)
        transit_s = _num(rec_cand.estimated_transit_hours if rec_cand else route.estimated_transit_hours, lang)
        wh_s = _num(rec_cand.wave_exposure_m if rec_cand else (ocean.significant_wave_height_m if ocean else None), lang)
        ws_s = _num(rec_cand.wind_exposure_knots if rec_cand else (weather.wind_speed_knots if weather else None), lang)
        r_risk = (rec_cand.marine_risk if rec_cand else route.overall_route_risk).value
        avoided = list(alt_cand.protected_areas) if alt_cand and alt_cand.crosses_protected_waters else []
        mpa_clause = _mpa_clause(lang, avoided)

        templates = {
            "te": (
                f"{orig_name} నుండి {dest_name} వరకు సిఫార్సు చేయబడిన కారిడార్ ({temporal_label}): "
                f"మొత్తం దూరం {dist_s} కి.మీ ({transit_s} గంటల ప్రయాణం). {mpa_clause} "
                f"అలల ఎత్తు {wh_s} మీటర్లు, గాలి వేగం {ws_s} నాట్స్. మొత్తం ప్రమాద స్థాయి: {r_risk}.",
                f"సిఫార్సు చేయబడిన సముద్ర కారిడార్ ద్వారా మాత్రమే ప్రయాణించండి. {mpa_clause}",
            ),
            "hi": (
                f"{orig_name} से {dest_name} तक अनुशंसित गलियारा ({temporal_label}): "
                f"कुल दूरी {dist_s} किमी ({transit_s} घंटे का पारगमन)। {mpa_clause} "
                f"लहर की ऊंचाई {wh_s} मीटर, हवा की गति {ws_s} समुद्री मील। समग्र जोखिम स्तर: {r_risk}।",
                f"अनुशंसित गलियारे से यात्रा करें। {mpa_clause}",
            ),
            "ta": (
                f"{orig_name} முதல் {dest_name} வரை பரிந்துரைக்கப்பட்ட பாதை ({temporal_label}): "
                f"மொத்த தூரம் {dist_s} கி.மீ ({transit_s} மணிநேரம்). {mpa_clause} "
                f"அலை உயரம் {wh_s} மீ, காற்று {ws_s} நாட்ஸ். அபாயம்: {r_risk}.",
                f"பரிந்துரைக்கப்பட்ட கடல் பாதையை மட்டுமே பயன்படுத்தவும். {mpa_clause}",
            ),
            "ml": (
                f"{orig_name} മുതൽ {dest_name} വരെയുള്ള ശുപാർശ ചെയ്യുന്ന ഇടനാഴി ({temporal_label}): "
                f"ദൂരം {dist_s} കി.മീ ({transit_s} മണിക്കൂർ). {mpa_clause} "
                f"തിരമാല: {wh_s} m, കാറ്റ്: {ws_s} kt. അപകടസാധ്യത: {r_risk}.",
                f"ശുപാർശ ചെയ്യുന്ന ഇടനാഴിയിലൂടെ യാത്ര ചെയ്യുക. {mpa_clause}",
            ),
            "kn": (
                f"{orig_name} ಇಂದ {dest_name} ವರೆಗೆ ಶಿಫಾರಸು ಮಾಡಿದ ಮಾರ್ಗ ({temporal_label}): "
                f"ಒಟ್ಟು ದೂರ {dist_s} ಕಿ.ಮೀ ({transit_s} ಗಂಟೆ). {mpa_clause} "
                f"ಅಲೆ: {wh_s} m, ಗಾಳಿ: {ws_s} kt. ಅಪಾಯ: {r_risk}.",
                f"ಶಿಫಾರಸು ಮಾಡಿದ ಮಾರ್ಗವನ್ನು ಮಾತ್ರ ಬಳಸಿ. {mpa_clause}",
            ),
            "bn": (
                f"{orig_name} থেকে {dest_name} পর্যন্ত সুপারিশকৃত করিডোর ({temporal_label}): "
                f"মোট দূরত্ব {dist_s} কিমি ({transit_s} ঘণ্টা)। {mpa_clause} "
                f"ঢেউ: {wh_s} মি, বাতাস: {ws_s} নট। ঝুঁকি: {r_risk}।",
                f"সুপারিশকৃত করিডোর দিয়ে যাত্রা করুন। {mpa_clause}",
            ),
            "mr": (
                f"{orig_name} ते {dest_name} शिफारस केलेला मार्ग ({temporal_label}): "
                f"एकूण अंतर {dist_s} किमी ({transit_s} तास). {mpa_clause} "
                f"लाटा: {wh_s} m, वारे: {ws_s} kt. धोका: {r_risk}.",
                f"शिफारस केलेल्या मार्गाने प्रवास करा. {mpa_clause}",
            ),
        }
        return templates[lang]

    # 3. SPATIAL WHAT-IF / DISPLACEMENT
    if intent_val == "spatial_what_if" and spatial_what_if:
        orig_n = spatial_what_if.origin.name
        dist = spatial_what_if.distance_km
        direction = spatial_what_if.direction
        top_c = spatial_what_if.top_changed_condition
        fact = getattr(spatial_what_if, "computed_fact", "") or spatial_what_if.physical_reasoning

        if lang == "te":
            summary = f"{orig_n} నుండి {dist:.0f} కి.మీ {direction} దిశగా కదిలితే ({spatial_what_if.temporal_label}): అత్యధికంగా మారే సముద్ర పరిస్థితి: {top_c}. {fact}"
            rec = f"ఆపరేషనల్ డైరెక్టివ్: {spatial_what_if.operational_significance}"
            return summary, rec
        elif lang == "hi":
            summary = f"{orig_n} से {dist:.0f} किमी {direction} दिशा में बढ़ने पर ({spatial_what_if.temporal_label}): सबसे अधिक बदलने वाली समुद्री स्थिति: {top_c}। {fact}"
            rec = f"परिचालन निर्देश: {spatial_what_if.operational_significance}"
            return summary, rec

    # 4. FISHING ZONES
    if intent_val == "fishing_zones" and pfz_list:
        top_z = pfz_list[0]
        if lang == "te":
            summary = (
                f"{location_name} సమీపంలో {len(pfz_list)} సంభావ్య చేపల వేట ప్రాంతాలు గుర్తించబడ్డాయి ({temporal_label}). "
                f"అత్యుత్తమ ప్రాంతం {top_z.name} (అనుకూలత స్కోర్: {top_z.suitability_score}/100), తీరం నుండి {top_z.distance_km:.1f} కి.మీ దూరంలో ఉంది."
            )
            rec = (
                f"లక్ష్య ప్రాంతం {top_z.name}: సమృద్ధిగా క్లోరోఫిల్ ({top_z.chlorophyll_mg_m3} mg/m³) మరియు అనుకూల ఉష్ణోగ్రత ({top_z.sst_c}°C) కలదు. "
                f"స్థానిక అలల ఎత్తు {top_z.wave_height_m}మీ. ప్రామాణిక భద్రతా నియమాలు పాటించండి."
            )
            return summary, rec
        elif lang == "hi":
            summary = (
                f"{location_name} के पास {len(pfz_list)} संभावित मत्स्य पालन क्षेत्र पहचाने गए हैं ({temporal_label})। "
                f"शीर्ष क्षेत्र {top_z.name} (उपयुक्तता स्कोर: {top_z.suitability_score}/100) है, जो तट से {top_z.distance_km:.1f} किमी दूरी पर है।"
            )
            rec = (
                f"लक्षित क्षेत्र {top_z.name}: प्रचुर क्लोरोफिल ({top_z.chlorophyll_mg_m3} mg/m³) और स्थिर तापीय क्षेत्र ({top_z.sst_c}°C)। "
                f"स्थानीय लहर की ऊंचाई {top_z.wave_height_m}मी है। मानक सुरक्षा सावधानियां बरतें।"
            )
            return summary, rec

    # 5. REGIONAL COMPARISON
    if intent_val == "regional_comparison" and comparison:
        loc_a_n = comparison.location_a.name
        loc_b_n = comparison.location_b.name
        verdict = comparison.overall_verdict

        if lang == "te":
            summary = f"{loc_a_n} మరియు {loc_b_n} మధ్య ప్రాంతీయ సముద్ర విశ్లేషణ ({temporal_label}). {verdict}"
            rec = "అలల తీవ్రత మరియు గాలి తక్కువగా ఉన్న ప్రశాంత సెక్టార్‌లోని కార్యకలాపాలకు ప్రాధాన్యత ఇవ్వండి."
            return summary, rec
        elif lang == "hi":
            summary = f"{loc_a_n} और {loc_b_n} के बीच तुलनात्मक समुद्री विश्लेषण ({temporal_label})। {verdict}"
            rec = "शांत क्षेत्र में संचालन को प्राथमिकता दें जहां लहरें और हवा सीमा के भीतर रहें।"
            return summary, rec

    # 6. DEFAULT MARINE SAFETY & GENERAL CONDITIONS
    wh_s = _num(ocean.significant_wave_height_m if ocean else None, lang)
    ws_s = _num(weather.wind_speed_knots if weather else None, lang)
    # MARINE_VOCAB spells moderate "mod_risk", so the old f"{band}_risk" lookup
    # missed MODERATE and printed the raw English enum in every vernacular.
    risk_label = band_label(lang, risk_category)

    if lang == "te":
        summary = (
            f"{location_name} వద్ద సముద్ర పరిస్థితులు ({temporal_label}): "
            f"మొత్తం ప్రమాద స్థాయి {risk_label}. "
            f"సార్థక అలల ఎత్తు {wh_s} మీటర్లు మరియు గాలి వేగం {ws_s} నాట్స్."
        )
        return summary, rec_text

    elif lang == "hi":
        summary = (
            f"{location_name} के पास समुद्री स्थिति ({temporal_label}): "
            f"समग्र जोखिम स्तर {risk_label}। "
            f"सार्थक लहर की ऊंचाई {wh_s} मीटर और हवा की गति {ws_s} समुद्री मील है।"
        )
        return summary, rec_text

    elif lang == "ta":
        summary = (
            f"{location_name} கடல் நிலைமைகள் ({temporal_label}): "
            f"ஆபத்து நிலை {risk_label}. "
            f"அலை உயரம் {wh_s} மீட்டர் மற்றும் காற்றின் வேகம் {ws_s} நாட்ஸ்."
        )
        return summary, rec_text

    elif lang == "ml":
        summary = (
            f"{location_name} സമുദ്രാവസ്ഥ ({temporal_label}): "
            f"അപകടസാധ്യത {risk_label}. "
            f"തിരമാല ഉയരം {wh_s} മീറ്ററും കാറ്റിന്റെ വേഗത {ws_s} നോട്ടും."
        )
        return summary, rec_text

    elif lang == "kn":
        summary = (
            f"{location_name} ಸಮುದ್ರ ಪರಿಸ್ಥಿತಿಗಳು ({temporal_label}): "
            f"ಅಪಾಯ ಮಟ್ಟ {risk_label}. "
            f"ಅಲೆಗಳ ಎತ್ತರ {wh_s} ಮೀಟರ್ ಮತ್ತು ಗಾಳಿಯ ವೇಗ {ws_s} ನಾಟ್‌ಗಳು."
        )
        return summary, rec_text

    elif lang == "bn":
        summary = (
            f"{location_name} সমুদ্রের পরিস্থিতি ({temporal_label}): "
            f"ঝুঁকির মাত্রা {risk_label}। "
            f"ঢেউয়ের উচ্চতা {wh_s} মিটার এবং বাতাসের গতি {ws_s} নট।"
        )
        return summary, rec_text

    elif lang == "mr":
        summary = (
            f"{location_name} सागरी परिस्थिती ({temporal_label}): "
            f"धोका पातळी {risk_label}. "
            f"लाटांची उंची {wh_s} मीटर आणि वाऱ्याचा वेग {ws_s} नॉट्स."
        )
        return summary, rec_text

    # Clean fallback for any other language in MARINE_VOCAB
    localized_summary = (
        f"[{vocab['safety_title']}] {location_name} ({temporal_label}) — "
        f"{risk_label}: {wh_s}m wave, {ws_s} kt wind. {rec_text}"
    )
    return localized_summary, rec_text

