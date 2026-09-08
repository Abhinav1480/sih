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
    english_recommendation: str
) -> Tuple[str, str]:
    """Generates localized summary and recommendation if non-English requested."""
    if lang == "en" or lang not in MARINE_VOCAB:
        return english_summary, english_recommendation

    vocab = MARINE_VOCAB[lang]
    is_safe = risk_category in ("LOW", "MODERATE")
    rec_text = vocab["rec_safe"] if is_safe else vocab["rec_unfavorable"]

    # Compose structured vernacular summary
    localized_summary = (
        f"[{vocab['safety_title']}] {location_name} - {temporal_label}. "
        f"పరిస్థితి / स्थिति: {risk_category}. {rec_text} "
        f"(English reference: {english_summary})"
    )

    return localized_summary, rec_text
