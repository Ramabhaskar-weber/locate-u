import { useState, useEffect, useRef } from 'react';
import {
  Languages,
  Volume2,
  Copy,
  Check,
  Search,
  Mic,
  MicOff,
  ArrowLeftRight,
  Trash2,
  Sparkles,
  MessageSquare,
  Loader2,
  History,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Badge, Button, Card, Glass } from '@/components/ui';
import { copyText } from '@/hooks';
import { toast } from '@/stores/toast';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  bcp47: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'auto', name: 'Auto-Detect', nativeName: 'Auto', bcp47: 'en-IN' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', bcp47: 'te-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', bcp47: 'hi-IN' },
  { code: 'en', name: 'English', nativeName: 'English', bcp47: 'en-IN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', bcp47: 'ta-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', bcp47: 'kn-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', bcp47: 'ml-IN' },
];

export const TARGET_LANGUAGES = SUPPORTED_LANGUAGES.filter((l) => l.code !== 'auto');

export type PhraseCategory =
  | 'Auto drivers'
  | 'Restaurants'
  | 'Hotels'
  | 'Shopping'
  | 'Directions'
  | 'Emergencies'
  | 'General conversation';

export interface VerifiedPhrase {
  id: string;
  category: PhraseCategory;
  english: string;
  teluguScript: string;
  teluguTranslit: string;
  hindi: string;
  frequent?: boolean;
}

export const PHRASE_CATEGORIES: PhraseCategory[] = [
  'Auto drivers',
  'Restaurants',
  'Hotels',
  'Shopping',
  'Directions',
  'Emergencies',
  'General conversation',
];

export const VERIFIED_PHRASE_LIBRARY: VerifiedPhrase[] = [
  {
    id: 'auto-1',
    category: 'Auto drivers',
    english: 'How much is the fare to the railway station?',
    teluguScript: 'రైల్వే స్టేషన్‌కు ఆటో చార్జీ ఎంత?',
    teluguTranslit: 'Railway station ku auto charge entha?',
    hindi: 'रेलवे स्टेशन का किराया कितना है? (Railway station ka kiraya kitna hai?)',
    frequent: true,
  },
  {
    id: 'auto-2',
    category: 'Auto drivers',
    english: 'Brother, please stop right here on the side.',
    teluguScript: 'అన్నా, దయచేసి ఇక్కడ పక్కన ఆపండి.',
    teluguTranslit: 'Anna, dayachesi ikkada pakkana aapandi.',
    hindi: 'भैया, कृपया यहीं साइड में रोक दीजिए। (Bhaiya, kripya yahin side mein rok dijiye.)',
    frequent: true,
  },
  {
    id: 'auto-3',
    category: 'Auto drivers',
    english: 'Please turn on the meter or go by the app fare.',
    teluguScript: 'దయచేసి మీటర్ వేయండి లేదా యాప్ చార్జీ ప్రకారం వెళ్దాం.',
    teluguTranslit: 'Dayachesi meter veyandi leda app charge prakaram veldam.',
    hindi: 'कृपया मीटर चालू करें या ऐप किराए से चलें। (Kripya meter chalu karein.)',
  },
  {
    id: 'rest-1',
    category: 'Restaurants',
    english: 'Please bring sealed drinking water and make the food less spicy.',
    teluguScript: 'దయచేసి మంచి నీళ్ల బాటిల్ ఇవ్వండి, కారం తక్కువ వేయండి.',
    teluguTranslit: 'Dayachesi manchi neella bottle ivvandi, kaaram thakkuva veyandi.',
    hindi: 'कृपया पीने का पानी दें और खाना कम तीखा बनाएं। (Peene ka paani dein aur kam teekha banayein.)',
    frequent: true,
  },
  {
    id: 'rest-2',
    category: 'Restaurants',
    english: 'Do you have pure vegetarian Andhra meals?',
    teluguScript: 'మీ దగ్గర స్వచ్ఛమైన శాకాహార ఆంధ్ర భోజనం ఉందా?',
    teluguTranslit: 'Mee daggara swachamaina shakahara Andhra bhojanam unda?',
    hindi: 'क्या यहाँ शुद्ध शाकाहारी भोजन मिलता है? (Kya yahan shuddh shakahari bhojan milta hai?)',
  },
  {
    id: 'hotel-1',
    category: 'Hotels',
    english: 'Do you have a clean AC room available for tonight?',
    teluguScript: 'ఈ రాత్రికి శుభ్రమైన ఏసీ రూమ్ ఖాళీగా ఉందా?',
    teluguTranslit: 'Ee rathriki shubhramaina AC room khaleega unda?',
    hindi: 'क्या आज रात के लिए साफ एसी कमरा उपलब्ध है? (Kya aaj raat ke liye AC kamra hai?)',
  },
  {
    id: 'hotel-2',
    category: 'Hotels',
    english: 'What time is breakfast and check-out?',
    teluguScript: 'టిఫిన్ మరియు చెక్-అవుట్ సమయం ఎప్పుడు?',
    teluguTranslit: 'Tiffin mariyu check-out samayam eppudu?',
    hindi: 'नाश्ता और चेक-आउट का समय क्या है? (Nashta aur check-out ka samay kya hai?)',
  },
  {
    id: 'shop-1',
    category: 'Shopping',
    english: 'How much does this cost? Can you give a fair discount?',
    teluguScript: 'దీని ధర ఎంత? కొంచెం ధర తగ్గించి ఇవ్వగలరా?',
    teluguTranslit: 'Deeni dhara entha? Konchem dhara thagginchi ivvagalara?',
    hindi: 'इसकी कीमत क्या है? क्या थोड़ा कम करेंगे? (Iski keemat kya hai? Kya thoda kam karenge?)',
    frequent: true,
  },
  {
    id: 'shop-2',
    category: 'Shopping',
    english: 'Do you accept PhonePe, Google Pay, or UPI?',
    teluguScript: 'మీరు ఫోన్‌పే, గూగుల్ పే లేదా యూపీఐ తీసుకుంటారా?',
    teluguTranslit: 'Meeru PhonePe, Google Pay leda UPI theesukuntara?',
    hindi: 'क्या आप PhonePe, Google Pay या UPI लेते हैं? (Kya aap PhonePe ya UPI lete hain?)',
  },
  {
    id: 'dir-1',
    category: 'Directions',
    english: 'Where is the nearest bus stand or railway station?',
    teluguScript: 'దగ్గరలో బస్ స్టాండ్ లేదా రైల్వే స్టేషన్ ఎక్కడ ఉంది?',
    teluguTranslit: 'Daggaralo bus stand leda railway station ekkada undi?',
    hindi: 'सबसे नज़दीकी बस स्टैंड या रेलवे स्टेशन कहाँ है? (Sabse nazdeeki bus stand kahan hai?)',
    frequent: true,
  },
  {
    id: 'dir-2',
    category: 'Directions',
    english: 'How far is Uppada Beach / Coringa from here?',
    teluguScript: 'ఇక్కడి నుండి ఉప్పాడ బీచ్ / కోరింగ ఎంత దూరం?',
    teluguTranslit: 'Ikkadi nundi Uppada Beach / Coringa entha dooram?',
    hindi: 'यहाँ से उप्पाडा बीच / कोरिंगा कितनी दूर है? (Yahan se Uppada Beach kitni door hai?)',
  },
  {
    id: 'emerg-1',
    category: 'Emergencies',
    english: 'Emergency! Please help me reach the nearest hospital or pharmacy.',
    teluguScript: 'అత్యవసరం! దగ్గరలోని ఆసుపత్రి లేదా మెడికల్ షాప్‌కు వెళ్లడానికి సహాయం చేయండి.',
    teluguTranslit: 'Athyavasaram! Daggaraloni aasupathri leda medical shop ku sahayam cheyandi.',
    hindi: 'आपातकाल! कृपया मुझे नज़दीकी अस्पताल या मेडिकल स्टोर पहुँचने में मदद करें। (Kripya aspataal pahunchne mein madad karein.)',
    frequent: true,
  },
  {
    id: 'conv-1',
    category: 'General conversation',
    english: 'Hello / Namaste! How are you doing?',
    teluguScript: 'నమస్కారం! మీరు ఎలా ఉన్నారు?',
    teluguTranslit: 'Namaskaram! Meeru ela unnaru?',
    hindi: 'नमस्ते! आप कैसे हैं? (Namaste! Aap kaise hain?)',
    frequent: true,
  },
  {
    id: 'conv-2',
    category: 'General conversation',
    english: 'Thank you very much for your kind help.',
    teluguScript: 'మీ సహాయానికి చాలా ధన్యవాదాలు.',
    teluguTranslit: 'Mee sahayaniki chala dhanyavadalu.',
    hindi: 'आपकी मदद के लिए बहुत धन्यवाद। (Aapki madad ke liye bahut dhanyavaad.)',
  },
];

export interface RecentTranslationItem {
  id: string;
  input: string;
  output: string;
  targetLang: string;
  sourceType: 'verified-library' | 'live-neural';
  at: string;
}

const RECENT_STORAGE_KEY = 'locate_u:recent_translations:v1';

export default function LanguagePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [speechSupported, setSpeechSupported] = useState(true);
  const [availableVoices, setAvailableVoices] = useState<{ te: boolean; hi: boolean; count: number }>({
    te: false,
    hi: false,
    count: 0,
  });
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [slowRate, setSlowRate] = useState(false);

  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('te');
  const [customInput, setCustomInput] = useState('');
  const [translationResult, setTranslationResult] = useState<{
    text: string;
    translit?: string;
    hindi?: string;
    sourceType: 'verified-library' | 'live-neural';
    providerLabel: string;
  } | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);

  const [recentTranslations, setRecentTranslations] = useState<RecentTranslationItem[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeechSupported(false);
      setSpeechError('Browser speech synthesis is not supported on this device.');
      return;
    }
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices() || [];
      const hasTe = voices.some((v) => v.lang.toLowerCase().startsWith('te'));
      const hasHi = voices.some((v) => v.lang.toLowerCase().startsWith('hi'));
      setAvailableVoices({ te: hasTe, hi: hasHi, count: voices.length });
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const saveRecent = (item: RecentTranslationItem) => {
    setRecentTranslations((prev) => {
      const next = [item, ...prev.filter((p) => p.input.toLowerCase() !== item.input.toLowerCase())].slice(0, 6);
      try {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const speakPhrase = (text: string, langBcp47: string) => {
    setSpeechError(null);
    if (!text.trim()) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeechError('Speech synthesis is unavailable in this browser.');
      toast('Speech synthesis is unavailable in this browser.', { tone: 'error' });
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const cleanText = text.split('(')[0].trim() || text;
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices() || [];
      const prefix = langBcp47.split('-')[0].toLowerCase();
      const matchedVoice = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
      if (matchedVoice) utterance.voice = matchedVoice;
      utterance.lang = langBcp47;
      utterance.rate = slowRate ? 0.78 : 0.92;
      utterance.onerror = () => {
        setSpeechError(`Could not play audio for ${langBcp47}.`);
      };
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeechError('Failed to start speech playback.');
    }
  };

  const handleCopy = async (id: string, text: string) => {
    if (!text.trim()) return;
    if (await copyText(text)) {
      setCopiedId(id);
      toast('Copied to clipboard', { tone: 'success' });
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  const handleTranslate = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const clean = (overrideText !== undefined ? overrideText : customInput).trim();
    if (!clean) return;

    setTranslating(true);
    setTranslationError(null);

    const qLower = clean.toLowerCase();
    const verifiedMatch = VERIFIED_PHRASE_LIBRARY.find(
      (p) =>
        p.english.toLowerCase() === qLower ||
        p.english.toLowerCase().includes(qLower) ||
        qLower.includes(p.english.toLowerCase().slice(0, 18)),
    );

    if (verifiedMatch && (targetLang === 'te' || targetLang === 'hi')) {
      const outText = targetLang === 'te' ? verifiedMatch.teluguScript : verifiedMatch.hindi;
      setTranslationResult({
        text: outText,
        translit: verifiedMatch.teluguTranslit,
        hindi: verifiedMatch.hindi,
        sourceType: 'verified-library',
        providerLabel: 'Verified Phrase Library',
      });
      saveRecent({
        id: String(Date.now()),
        input: clean,
        output: outText,
        targetLang,
        sourceType: 'verified-library',
        at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      setTranslating(false);
      return;
    }

    try {
      const pair = `${sourceLang === 'auto' ? 'en' : sourceLang}|${targetLang}`;
      const r = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=${pair}`,
      );
      const d = await r.json();
      const translated = d?.responseData?.translatedText;
      if (translated && typeof translated === 'string') {
        setTranslationResult({
          text: translated,
          sourceType: 'live-neural',
          providerLabel: 'MyMemory Neural Translation',
        });
        saveRecent({
          id: String(Date.now()),
          input: clean,
          output: translated,
          targetLang,
          sourceType: 'live-neural',
          at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } else {
        throw new Error('No translation returned');
      }
    } catch {
      setTranslationError(
        'Live translation service is unreachable right now. Use the verified Telugu & Hindi phrases on the left.',
      );
      setTranslationResult(null);
    } finally {
      setTranslating(false);
    }
  };

  const handleVoiceInput = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSpeechError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    try {
      const rec = new SR();
      const meta = SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang) || SUPPORTED_LANGUAGES[0];
      rec.lang = meta.bcp47;
      rec.onstart = () => {
        setSpeechError(null);
        setListening(true);
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => {
        setListening(false);
        setSpeechError('Microphone voice input failed or permission was denied.');
      };
      rec.onresult = (ev: any) => {
        const transcript = ev.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setCustomInput(transcript);
          handleTranslate(undefined, transcript);
        }
      };
      recognitionRef.current = rec;
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const filteredPhrases = VERIFIED_PHRASE_LIBRARY.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.english.toLowerCase().includes(q) ||
      p.teluguScript.toLowerCase().includes(q) ||
      p.teluguTranslit.toLowerCase().includes(q) ||
      p.hindi.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const frequentPhrases = VERIFIED_PHRASE_LIBRARY.filter((p) => p.frequent);
  const targetLangMeta = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang) || SUPPORTED_LANGUAGES[1];

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12 w-full max-w-full overflow-x-hidden">
      <Glass className="p-5 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-300">
              <Languages className="h-3.5 w-3.5" /> Verified Telugu, Hindi & Multi-Language Assistant
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Language Assistant</h1>
            <p className="mt-1 text-sm text-muted sm:text-base max-w-2xl">
              Communicate with auto drivers, restaurants, hotels, and shopkeepers using verified Telugu script, English transliteration, Hindi translations, and live speech playback.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={speechSupported ? 'green' : 'red'}>
              <CheckCircle2 className="h-3 w-3" />
              {speechSupported
                ? `Speech Ready (${availableVoices.count} voices)`
                : 'Speech Unavailable'}
            </Badge>
            <button
              type="button"
              onClick={() => setSlowRate((r) => !r)}
              className={`rounded-2xl border px-3 py-1.5 text-xs font-semibold transition ${
                slowRate
                  ? 'border-brand-500 bg-brand-600 text-white'
                  : 'border-black/10 bg-black/[0.03] text-muted dark:border-white/10'
              }`}
            >
              Speed: {slowRate ? 'Slow (0.78x)' : 'Normal (1.0x)'}
            </button>
          </div>
        </div>

        {speechError && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>{speechError}</span>
          </div>
        )}
      </Glass>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          <Card
            title="Verified Tourist Phrase Library"
            subtitle="Every phrase includes Telugu script, English meaning, English transliteration, and Hindi translation."
            icon={<Languages className="h-5 w-5" />}
          >
            <div className="mb-4 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  selectedCategory === 'all'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-black/5 hover:bg-black/10 dark:bg-white/10'
                }`}
              >
                All ({VERIFIED_PHRASE_LIBRARY.length})
              </button>
              {PHRASE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    selectedCategory === cat
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-black/5 hover:bg-black/10 dark:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search phrases in English, Telugu, transliteration, or Hindi..."
                className="h-11 w-full rounded-2xl border border-black/10 bg-black/[0.02] pl-10 pr-4 text-xs sm:text-sm focus:border-brand-500 focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
              />
            </div>

            <div className="space-y-3">
              {filteredPhrases.map((phrase) => (
                <div
                  key={phrase.id}
                  className="rounded-3xl border border-black/10 bg-black/[0.02] p-4 transition hover:border-brand-500/40 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge tone="brand">{phrase.category}</Badge>
                        <Badge tone="green">Verified Phrase</Badge>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white pt-0.5">
                        {phrase.english}
                      </h3>
                      <div className="text-lg font-extrabold text-brand-600 dark:text-brand-300 leading-snug">
                        {phrase.teluguScript}
                      </div>
                      <div className="text-xs font-mono italic text-muted">
                        Telugu Transliteration: “{phrase.teluguTranslit}”
                      </div>
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Hindi: {phrase.hindi}
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => speakPhrase(phrase.teluguScript, 'te-IN')}
                        className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        <span>Speak Telugu</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => speakPhrase(phrase.hindi, 'hi-IN')}
                        className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        <span>Speak Hindi</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            phrase.id,
                            `${phrase.english} | Telugu: ${phrase.teluguScript} (${phrase.teluguTranslit}) | Hindi: ${phrase.hindi}`,
                          )
                        }
                        className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-black/5 px-3 text-xs font-semibold hover:bg-black/10 dark:bg-white/10"
                      >
                        {copiedId === phrase.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-5 lg:col-span-5">
          <Card
            title="Custom Sentence Translator"
            subtitle="Translate custom sentences with verified library matching and live neural translation."
            icon={<MessageSquare className="h-5 w-5" />}
          >
            <form onSubmit={(e) => handleTranslate(e)} className="space-y-3">
              <div className="grid grid-cols-5 items-center gap-2">
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="col-span-2 h-10 rounded-2xl border border-black/10 bg-black/[0.03] px-2.5 text-xs font-semibold dark:border-white/10 dark:bg-slate-900"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      From: {l.name}
                    </option>
                  ))}
                </select>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      const prevSrc = sourceLang === 'auto' ? 'en' : sourceLang;
                      setSourceLang(targetLang);
                      setTargetLang(prevSrc);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-black/[0.03] hover:bg-brand-600 hover:text-white dark:border-white/10"
                    title="Swap languages"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="col-span-2 h-10 rounded-2xl border border-black/10 bg-black/[0.03] px-2.5 text-xs font-semibold dark:border-white/10 dark:bg-slate-900"
                >
                  {TARGET_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      To: {l.name} ({l.nativeName})
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                rows={3}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Enter any sentence to translate..."
                className="w-full rounded-2xl border border-black/10 bg-black/[0.02] p-3.5 text-xs sm:text-sm focus:border-brand-500 focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
                required
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  className={`inline-flex h-10 items-center gap-1.5 rounded-2xl px-3.5 text-xs font-bold transition ${
                    listening
                      ? 'animate-pulse bg-red-600 text-white'
                      : 'bg-black/5 hover:bg-black/10 dark:bg-white/10'
                  }`}
                >
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  <span>{listening ? 'Listening...' : 'Voice Input'}</span>
                </button>

                {customInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomInput('');
                      setTranslationResult(null);
                      setTranslationError(null);
                    }}
                    className="inline-flex h-10 items-center gap-1 rounded-2xl bg-black/5 px-3 text-xs font-semibold text-red-600 hover:bg-red-500/10 dark:bg-white/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Clear
                  </button>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={translating || !customInput.trim()}
                  icon={
                    translating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )
                  }
                >
                  {translating ? 'Translating...' : 'Translate'}
                </Button>
              </div>
            </form>

            {translationError && (
              <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                {translationError}
              </div>
            )}

            {translationResult && (
              <div className="mt-4 rounded-3xl border border-brand-500/30 bg-brand-500/[0.05] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Badge tone={translationResult.sourceType === 'verified-library' ? 'green' : 'brand'}>
                    {translationResult.providerLabel}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => speakPhrase(translationResult.text, targetLangMeta.bcp47)}
                      className="inline-flex h-8 items-center gap-1 rounded-xl bg-brand-600 px-2.5 text-xs font-bold text-white"
                    >
                      <Volume2 className="h-3.5 w-3.5" /> Speak
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy('custom-out', translationResult.text)}
                      className="inline-flex h-8 items-center gap-1 rounded-xl bg-black/10 px-2.5 text-xs font-semibold dark:bg-white/10"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                  </div>
                </div>
                <div className="text-lg font-extrabold text-brand-700 dark:text-brand-200">
                  {translationResult.text}
                </div>
                {translationResult.translit && (
                  <div className="text-xs font-mono italic text-muted">
                    Transliteration: “{translationResult.translit}”
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card
            title="Frequently Used Phrases"
            subtitle="1-tap essentials for quick roadside communication."
            icon={<Sparkles className="h-5 w-5" />}
          >
            <div className="space-y-2">
              {frequentPhrases.map((fp) => (
                <div
                  key={fp.id}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-black/10 bg-black/[0.02] p-3 text-xs dark:border-white/10"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate">{fp.english}</div>
                    <div className="text-brand-600 dark:text-brand-300 font-semibold truncate">
                      {fp.teluguScript} · <span className="font-mono italic text-muted">{fp.teluguTranslit}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => speakPhrase(fp.teluguScript, 'te-IN')}
                    className="shrink-0 rounded-xl bg-brand-600 px-2.5 py-1.5 font-bold text-white"
                  >
                    🔊 TE
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {recentTranslations.length > 0 && (
            <Card
              title="Recent Translations"
              subtitle="Your latest custom translations on this device."
              icon={<History className="h-5 w-5" />}
            >
              <div className="space-y-2">
                {recentTranslations.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-black/10 bg-black/[0.02] p-3 text-xs dark:border-white/10"
                  >
                    <div className="flex items-center justify-between text-[11px] text-muted">
                      <span>{item.sourceType === 'verified-library' ? 'Verified Library' : 'Neural API'}</span>
                      <span>{item.at}</span>
                    </div>
                    <div className="mt-1 font-medium text-muted">{item.input}</div>
                    <div className="mt-0.5 font-bold text-brand-600 dark:text-brand-300">{item.output}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
