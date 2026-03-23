import { useState, useRef, useEffect, useCallback, memo } from "react";
import "./App.css";

// ═══════════════════════════════════════════════════════════
// SECURITY UTILITIES
// ═══════════════════════════════════════════════════════════
const sanitize = (str) => {
  if (typeof str !== "string") return "";
  return str
    .replace(/[<>]/g, "") // strip HTML tags
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim()
    .slice(0, 2000); // max length
};

const rateLimit = (() => {
  const map = {};
  return (key, maxCalls, windowMs) => {
    const now = Date.now();
    if (!map[key]) map[key] = [];
    map[key] = map[key].filter(t => now - t < windowMs);
    if (map[key].length >= maxCalls) return false;
    map[key].push(now);
    return true;
  };
})();

// ═══════════════════════════════════════════════════════════
// INDIA LANGUAGES
// ═══════════════════════════════════════════════════════════
const LANGUAGES = [
  { code: "hi", name: "हिंदी", label: "Hindi" },
  { code: "en", name: "English", label: "English" },
  { code: "hinglish", name: "Hinglish", label: "Hinglish" },
  { code: "bn", name: "বাংলা", label: "Bengali" },
  { code: "te", name: "తెలుగు", label: "Telugu" },
  { code: "mr", name: "मराठी", label: "Marathi" },
  { code: "ta", name: "தமிழ்", label: "Tamil" },
  { code: "gu", name: "ગુજરાતી", label: "Gujarati" },
  { code: "kn", name: "ಕನ್ನಡ", label: "Kannada" },
  { code: "ml", name: "മലയാളം", label: "Malayalam" },
  { code: "pa", name: "ਪੰਜਾਬੀ", label: "Punjabi" },
  { code: "or", name: "ଓଡ଼ିଆ", label: "Odia" },
  { code: "as", name: "অসমীয়া", label: "Assamese" },
  { code: "ur", name: "اردو", label: "Urdu" },
  { code: "sa", name: "संस्कृत", label: "Sanskrit" },
  { code: "mai", name: "मैथिली", label: "Maithili" },
  { code: "bho", name: "भोजपुरी", label: "Bhojpuri" },
  { code: "raj", name: "राजस्थानी", label: "Rajasthani" },
  { code: "ks", name: "कश्मीरी", label: "Kashmiri" },
  { code: "ne", name: "नेपाली", label: "Nepali" },
  { code: "sd", name: "سنڌي", label: "Sindhi" },
  { code: "kok", name: "कोंकणी", label: "Konkani" },
];

const LANG_SYSTEM = {
  hi: "तुम AmanAI हो — एक बेहतरीन, दोस्ताना और मददगार AI। हमेशा हिंदी में जवाब दो। छोटे और साफ जवाब दो।",
  en: "You are AmanAI — a smart, friendly and helpful AI assistant. Always respond in English. Be concise and clear.",
  hinglish: "Tu AmanAI hai — ek smart aur helpful AI. Hamesha Hinglish mein baat kar (Hindi + English mix). Short aur clear jawab de.",
  bn: "তুমি AmanAI — একটি স্মার্ট, বন্ধুত্বপূর্ণ AI। সবসময় বাংলায় উত্তর দাও।",
  te: "మీరు AmanAI — తెలివైన, స్నేహపూర్వక AI. ఎల్లప్పుడూ తెలుగులో సమాధానం ఇవ్వండి.",
  mr: "तू AmanAI आहेस — एक हुशार, मैत्रीपूर्ण AI. नेहमी मराठीत उत्तर दे.",
  ta: "நீங்கள் AmanAI — ஒரு புத்திசாலி, நட்பான AI. எப்போதும் தமிழில் பதில் சொல்லுங்கள்.",
  gu: "તમે AmanAI છો — એક સ્માર્ટ, મૈત્રીપૂર્ણ AI. હંમેશા ગુજરાતીમાં જવાબ આપો.",
  kn: "ನೀವು AmanAI — ಒಂದು ಬುದ್ಧಿವಂತ, ಸ್ನೇಹಪರ AI. ಯಾವಾಗಲೂ ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ.",
  ml: "നിങ്ങൾ AmanAI — ഒരു സ്മാർട്ട്, സൗഹൃദ AI. എപ്പോഴും മലയാളത്തിൽ ഉത്തരം നൽകൂ.",
  pa: "ਤੁਸੀਂ AmanAI ਹੋ — ਇੱਕ ਸਮਝਦਾਰ, ਦੋਸਤਾਨਾ AI. ਹਮੇਸ਼ਾ ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦਿਓ।",
  or: "ତୁମେ AmanAI — ଏକ ସ୍ମାର୍ଟ AI। ସବୁବେଳେ ଓଡ଼ିଆରେ ଉତ୍ତର ଦିଅ।",
  as: "তুমি AmanAI — এটি স্মাৰ্ট AI। সদায় অসমীয়াত উত্তৰ দিয়া।",
  ur: "آپ AmanAI ہیں — ایک ذہین، دوستانہ AI۔ ہمیشہ اردو میں جواب دیں۔",
  sa: "भवान् AmanAI अस्ति — एकः बुद्धिमान् AI। सदा संस्कृते उत्तरं ददातु।",
  mai: "अहाँ AmanAI छी — एक चतुर AI। हमेशा मैथिली में जवाब दी।",
  bho: "रउरा AmanAI बानी — एक चतुर AI। हमेशा भोजपुरी में जवाब दीं।",
  raj: "थे AmanAI हो — एक चतुर AI। हमेशा राजस्थानी में जवाब दो।",
  ks: "تۄہِ AmanAI چھِو — اکھ ذہین AI۔ ہمیشہ کشمیری میں جواب دیو۔",
  ne: "तपाईं AmanAI हुनुहुन्छ — एक स्मार्ट AI। सधैं नेपालीमा जवाफ दिनुस्।",
  sd: "توهان AmanAI آهيو — هڪ ذهين AI. هميشه سنڌيءَ ۾ جواب ڏيو.",
  kok: "तुम AmanAI आसाय — एक हुशार AI। सदांच कोंकणींत जाप दी.",
};

// ═══════════════════════════════════════════════════════════
// IMAGE CONFIG
// ═══════════════════════════════════════════════════════════
const IMG_MODELS = [
  { id: "flux", name: "FLUX", tag: "Best Quality", desc: "Sabse achhi quality" },
  { id: "flux-realism", name: "Realism", tag: "Ultra HD", desc: "Bilkul real jaise" },
  { id: "flux-anime", name: "Anime", tag: "Cartoon", desc: "Anime/manga style" },
  { id: "flux-3d", name: "3D", tag: "3D Art", desc: "3D render style" },
  { id: "turbo", name: "Turbo", tag: "⚡ Fast", desc: "Jaldi generate" },
];

const STYLES = [
  { label: "Auto (Best)", value: "", emoji: "✨" },
  { label: "Photorealistic", value: "photorealistic, ultra detailed, 8k resolution, sharp focus, professional photography", emoji: "📷" },
  { label: "Cinematic", value: "cinematic shot, movie still, dramatic lighting, film grain, anamorphic lens", emoji: "🎬" },
  { label: "Anime", value: "anime art style, vibrant colors, manga illustration, studio ghibli inspired", emoji: "🎌" },
  { label: "Oil Painting", value: "oil painting, textured canvas, masterpiece, fine art, museum quality", emoji: "🖼️" },
  { label: "Watercolor", value: "watercolor painting, soft edges, flowing colors, artistic", emoji: "🎨" },
  { label: "Cyberpunk", value: "cyberpunk, neon lights, futuristic city, rain, blade runner aesthetic", emoji: "🌆" },
  { label: "Fantasy", value: "fantasy art, magical, ethereal glow, epic, mythical, detailed illustration", emoji: "🧙" },
  { label: "Sketch", value: "pencil sketch, hand drawn, detailed linework, artistic drawing", emoji: "✏️" },
  { label: "Digital Art", value: "digital art, concept art, artstation, highly detailed, trending", emoji: "💻" },
  { label: "Vintage", value: "vintage photography, retro, film noir, aged, nostalgic", emoji: "📸" },
  { label: "Minimalist", value: "minimalist, clean, simple, modern design, white background", emoji: "◻️" },
];

const SIZES = [
  { label: "Square 1:1", width: 1024, height: 1024, icon: "⬛" },
  { label: "Portrait 2:3", width: 832, height: 1216, icon: "📱" },
  { label: "Landscape 3:2", width: 1216, height: 832, icon: "🖥️" },
  { label: "Wide 16:9", width: 1344, height: 768, icon: "📺" },
  { label: "Ultra Wide", width: 1536, height: 640, icon: "🎞️" },
];

const QUALITY_ENHANCERS = "masterpiece, best quality, highly detailed, professional, award winning";

// ═══════════════════════════════════════════════════════════
// PROMPT ENHANCER — imagination power
// ═══════════════════════════════════════════════════════════
async function enhancePrompt(rawPrompt, style) {
  const styleHint = style ? `Style: ${style}.` : "";
  const body = {
    model: "openai",
    messages: [
      {
        role: "system",
        content: `You are an expert AI image prompt engineer. Convert any simple description into a detailed, vivid, professional image generation prompt in English. ${styleHint} Add lighting, atmosphere, composition details. Keep it under 200 words. Return ONLY the enhanced prompt, nothing else.`
      },
      { role: "user", content: rawPrompt }
    ]
  };
  const res = await fetch("https://text.pollinations.ai/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return rawPrompt;
  const data = await res.json();
  return data.choices?.[0]?.message?.content || rawPrompt;
}

// ═══════════════════════════════════════════════════════════
// CHAT API
// ═══════════════════════════════════════════════════════════
async function chatAPI(messages, langCode) {
  const system = LANG_SYSTEM[langCode] || LANG_SYSTEM["hinglish"];
  const body = {
    model: "openai",
    messages: [
      { role: "system", content: system + " Apna naam AmanAI hai. Helpful, friendly aur concise raho." },
      ...messages.slice(-20).map(m => ({ role: m.role, content: m.content }))
    ]
  };
  const res = await fetch("https://text.pollinations.ai/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API Error ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "Kuch problem aa gayi. Dobara try karo!";
}

// ═══════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════
const TypingDots = memo(() => (
  <div className="typing-dots"><span/><span/><span/></div>
));

const ImageCard = memo(({ img, index, onDownload }) => {
  if (img.loading) return (
    <div className="img-card loading-card">
      <div className="img-shimmer">
        <div className="shimmer-orb"/>
        <p className="shimmer-text">Imagination power se ban rahi hai... ✨</p>
        <div className="shimmer-bar"/>
        <div className="shimmer-bar short"/>
      </div>
    </div>
  );
  if (img.error) return (
    <div className="img-card error-card">
      <div className="error-inner"><span>😔</span><p>{img.error}</p></div>
    </div>
  );
  return (
    <div className="img-card done-card">
      <div className="img-wrapper">
        <img src={img.url} alt={`AmanAI generated ${index+1}`} className="gen-img" loading="lazy"/>
        <div className="img-overlay">
          <button className="overlay-btn" onClick={() => onDownload(img, index)}>⬇ Download</button>
          <button className="overlay-btn" onClick={() => window.open(img.url,"_blank")}>🔍 Full Size</button>
          <button className="overlay-btn" onClick={() => navigator.clipboard.writeText(img.enhancedPrompt || img.prompt)}>📋 Prompt</button>
        </div>
      </div>
      {img.enhancedPrompt && (
        <div className="prompt-preview">
          <span className="prompt-icon">✨</span>
          <span className="prompt-text">{img.enhancedPrompt.slice(0,80)}...</span>
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState("image");
  const [lang, setLang] = useState("hinglish");
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Image
  const [imgPrompt, setImgPrompt] = useState("");
  const [imgModel, setImgModel] = useState("flux");
  const [imgStyle, setImgStyle] = useState("");
  const [imgSize, setImgSize] = useState(SIZES[0]);
  const [imgCount, setImgCount] = useState(1);
  const [useEnhancer, setUseEnhancer] = useState(true);
  const [images, setImages] = useState([]);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState("");
  const [genIndex, setGenIndex] = useState(null);
  const [enhancing, setEnhancing] = useState(false);

  // Chat
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Salam! Main AmanAI hoon 🌸 Tumhara personal AI — image bhi banata hoon, baat bhi karta hoon! Kuch bhi pucho, kisi bhi Indian language mein! 😊" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef(null);
  const langMenuRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  // Close lang menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Image Generate ──
  const generateImage = useCallback(async () => {
    const cleanPrompt = sanitize(imgPrompt);
    if (!cleanPrompt) return setImgError("Prompt likho pehle!");

    // Rate limit: 10 images per minute
    if (!rateLimit("imgGen", 10, 60000)) {
      return setImgError("Thoda ruko! 1 minute mein zyada images generate ho gayi. 60 second baad try karo.");
    }

    setImgLoading(true);
    setImgError("");

    const newImgs = Array(imgCount).fill(null).map((_, i) => ({
      id: Date.now() + i, loading: true, url: null, prompt: cleanPrompt,
    }));
    setImages(prev => [...newImgs, ...prev]);

    for (let i = 0; i < imgCount; i++) {
      setGenIndex(i + 1);
      try {
        let finalPrompt = cleanPrompt;

        // Imagination enhancer
        if (useEnhancer) {
          setEnhancing(true);
          try {
            const enhanced = await enhancePrompt(cleanPrompt, imgStyle);
            finalPrompt = sanitize(enhanced);
          } catch { /* use original */ }
          setEnhancing(false);
        }

        // Add style + quality
        const styleStr = imgStyle ? `, ${imgStyle}` : "";
        const fullPrompt = `${finalPrompt}${styleStr}, ${QUALITY_ENHANCERS}`;

        const seed = Math.floor(Math.random() * 9999999);
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?model=${imgModel}&width=${imgSize.width}&height=${imgSize.height}&seed=${seed}&nologo=true&enhance=false&nofeed=true`;

        await new Promise((resolve, reject) => {
          const tester = new window.Image();
          const timeout = setTimeout(() => reject(new Error("Timeout — dobara try karo")), 60000);
          tester.onload = () => { clearTimeout(timeout); resolve(); };
          tester.onerror = () => { clearTimeout(timeout); reject(new Error("Image load nahi hui. Prompt change karke try karo.")); };
          tester.src = url;
        });

        setImages(prev => prev.map(x =>
          x.id === newImgs[i].id
            ? { ...x, loading: false, url, prompt: cleanPrompt, enhancedPrompt: finalPrompt }
            : x
        ));
      } catch (err) {
        setImages(prev => prev.map(x =>
          x.id === newImgs[i].id ? { ...x, loading: false, error: err.message } : x
        ));
        setImgError(`Image ${i+1} fail hui: ${err.message}`);
      }
    }
    setImgLoading(false);
    setGenIndex(null);
    setEnhancing(false);
  }, [imgPrompt, imgStyle, imgModel, imgSize, imgCount, useEnhancer]);

  const downloadImg = useCallback((img, i) => {
    const a = document.createElement("a");
    a.href = img.url;
    a.target = "_blank";
    a.download = `AmanAI-${i+1}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  // ── Chat ──
  const sendChat = useCallback(async () => {
    const text = sanitize(chatInput);
    if (!text || chatLoading) return;

    // Rate limit: 20 messages per minute
    if (!rateLimit("chat", 20, 60000)) {
      return setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ Thoda ruko! Bahut saare messages aa gaye. 1 minute baad try karo. 🙏"
      }]);
    }

    const userMsg = { role: "user", content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setChatInput("");
    setChatLoading(true);

    try {
      const reply = await chatAPI(newMsgs, lang);
      setMessages(prev => [...prev, { role: "assistant", content: sanitize(reply) }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `⚠️ Error: ${err.message}. Internet check karo aur dobara try karo!`
      }]);
    }
    setChatLoading(false);
  }, [chatInput, chatLoading, messages, lang]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); }
  };

  const currentLang = LANGUAGES.find(l => l.code === lang);

  return (
    <div className="app">
      {/* BG */}
      <div className="bg-mesh" aria-hidden="true">
        <div className="blob b1"/><div className="blob b2"/><div className="blob b3"/>
        <div className="grid-overlay"/>
      </div>

      {/* HEADER */}
      <header className="header">
        <div className="brand">
          <div className="brand-logo" aria-label="AmanAI Logo">
            <span className="logo-letter">A</span>
            <div className="logo-ring"/>
          </div>
          <div className="brand-text">
            <h1 className="brand-name">Aman<span>AI</span></h1>
            <p className="brand-tagline">India's Personal AI · Free & Unlimited</p>
          </div>
        </div>

        <div className="header-right">
          {/* Language Selector */}
          <div className="lang-selector" ref={langMenuRef}>
            <button className="lang-btn" onClick={() => setShowLangMenu(v => !v)} aria-label="Select Language">
              <span className="lang-flag">🌐</span>
              <span className="lang-current">{currentLang?.name}</span>
              <span className="lang-arrow">{showLangMenu ? "▲" : "▼"}</span>
            </button>
            {showLangMenu && (
              <div className="lang-dropdown" role="listbox">
                <div className="lang-dropdown-title">🇮🇳 Indian Languages</div>
                <div className="lang-grid">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      className={`lang-option ${lang === l.code ? "active" : ""}`}
                      onClick={() => { setLang(l.code); setShowLangMenu(false); }}
                      role="option"
                      aria-selected={lang === l.code}
                    >
                      <span className="lang-native">{l.name}</span>
                      <span className="lang-label">{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="header-badges">
            <span className="hbadge">✨ Free</span>
            <span className="hbadge">🔒 Secure</span>
            <span className="hbadge">🌸 Premium</span>
          </div>
        </div>
      </header>

      {/* TABS */}
      <nav className="tabs" role="tablist">
        <button
          className={`tab ${tab==="image"?"active":""}`}
          onClick={() => setTab("image")}
          role="tab" aria-selected={tab==="image"}
        >
          <span className="tab-icon">🎨</span>
          <span>Image Generator</span>
        </button>
        <button
          className={`tab ${tab==="chat"?"active":""}`}
          onClick={() => setTab("chat")}
          role="tab" aria-selected={tab==="chat"}
        >
          <span className="tab-icon">💬</span>
          <span>AI Chat</span>
          {messages.length > 1 && <span className="tab-badge">{messages.filter(m=>m.role==="assistant").length}</span>}
        </button>
      </nav>

      {/* ══ IMAGE TAB ══ */}
      {tab === "image" && (
        <main className="main" role="main">

          {/* Prompt */}
          <div className="card prompt-card">
            <label className="label" htmlFor="img-prompt">
              ✍️ Apni Imagination Describe Karo
              <span className="label-hint">Kuch bhi likho — humara AI usse amazing image mein badlega</span>
            </label>
            <div className="prompt-wrap">
              <textarea
                id="img-prompt"
                className="textarea"
                placeholder="Kuch bhi describe karo... jaise: 'ek sher aur sher ki dosti pahadon par suryast ke samay' ya 'a dragon flying over Taj Mahal at night with aurora borealis'"
                value={imgPrompt}
                onChange={e => { setImgPrompt(e.target.value); setImgError(""); }}
                rows={4}
                maxLength={2000}
                aria-describedby="prompt-help"
              />
              <div className="prompt-footer">
                <span className="char-count" id="prompt-help">{imgPrompt.length}/2000</span>
                <label className="enhancer-toggle">
                  <input
                    type="checkbox"
                    checked={useEnhancer}
                    onChange={e => setUseEnhancer(e.target.checked)}
                  />
                  <span className="toggle-track">
                    <span className="toggle-thumb"/>
                  </span>
                  <span className="toggle-label">🧠 Imagination Enhancer {useEnhancer ? "ON" : "OFF"}</span>
                </label>
              </div>
            </div>
            {useEnhancer && (
              <div className="enhancer-info">
                💡 Imagination Enhancer tumhari simple description ko ultra-detailed professional prompt mein badlega — ekdum amazing results!
              </div>
            )}
          </div>

          {/* Model */}
          <div className="card">
            <label className="label">🤖 AI Model</label>
            <div className="model-grid">
              {IMG_MODELS.map(m => (
                <button
                  key={m.id}
                  className={`model-btn ${imgModel===m.id?"active":""}`}
                  onClick={() => setImgModel(m.id)}
                  title={m.desc}
                >
                  <span className="model-name">{m.name}</span>
                  <span className="model-tag">{m.tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div className="card">
            <label className="label">🎨 Art Style</label>
            <div className="style-grid">
              {STYLES.map(s => (
                <button
                  key={s.label}
                  className={`style-btn ${imgStyle===s.value?"active":""}`}
                  onClick={() => setImgStyle(s.value)}
                >
                  <span>{s.emoji}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Size & Count */}
          <div className="card two-col">
            <div>
              <label className="label">📐 Image Size</label>
              <div className="size-btns">
                {SIZES.map(s => (
                  <button
                    key={s.label}
                    className={`size-btn ${JSON.stringify(imgSize)===JSON.stringify(s)?"active":""}`}
                    onClick={() => setImgSize(s)}
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">🔢 Kitni Images: <strong className="count-num">{imgCount}</strong></label>
              <input
                type="range" min={1} max={4} value={imgCount}
                onChange={e => setImgCount(+e.target.value)}
                className="slider" aria-label="Image count"
              />
              <div className="slider-labels">
                {[1,2,3,4].map(n=>(
                  <span key={n} className={imgCount>=n?"active":""}>{n}</span>
                ))}
              </div>
            </div>
          </div>

          {imgError && (
            <div className="error-box" role="alert">⚠️ {imgError}</div>
          )}

          <button
            className="gen-btn"
            onClick={generateImage}
            disabled={imgLoading}
            aria-label="Generate Image"
          >
            {imgLoading ? (
              <span className="btn-inner">
                <span className="spinner"/>
                {enhancing ? "🧠 Imagination enhance ho rahi hai..." : `🌸 Image ${genIndex}/${imgCount} ban rahi hai...`}
              </span>
            ) : (
              <span className="btn-inner">
                🌸 Generate {imgCount>1?`${imgCount} Images`:"Image"}
                {useEnhancer && <span className="btn-badge">+ AI Enhance</span>}
              </span>
            )}
          </button>

          {/* Gallery */}
          {images.length > 0 && (
            <section className="gallery-section" aria-label="Generated Images">
              <div className="gallery-hdr">
                <h2>🖼️ Generated Images <span className="gallery-count">({images.length})</span></h2>
                <button className="clear-btn" onClick={() => setImages([])}>🗑️ Clear All</button>
              </div>
              <div className="gallery">
                {images.map((img,i) => (
                  <ImageCard key={img.id} img={img} index={i} onDownload={downloadImg}/>
                ))}
              </div>
            </section>
          )}
        </main>
      )}

      {/* ══ CHAT TAB ══ */}
      {tab === "chat" && (
        <section className="chat-wrap" aria-label="AI Chat">
          <div className="chat-lang-bar">
            <span>🌐 Baat kar rahe ho:</span>
            <strong>{currentLang?.name} ({currentLang?.label})</strong>
            <button className="change-lang-btn" onClick={() => { setTab("image"); setTimeout(()=>setShowLangMenu(true),100); }}>
              Change Language
            </button>
          </div>

          <div className="chat-messages" role="log" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                {m.role==="assistant" && (
                  <div className="msg-avatar" aria-label="AmanAI">A</div>
                )}
                <div className="msg-bubble">
                  <div className="msg-content">{m.content}</div>
                </div>
                {m.role==="user" && (
                  <div className="msg-avatar user-av" aria-label="You">👤</div>
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="msg assistant">
                <div className="msg-avatar">A</div>
                <div className="msg-bubble"><TypingDots/></div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          <div className="chat-bottom">
            <div className="chat-input-wrap">
              <textarea
                className="chat-input"
                placeholder={`${currentLang?.name} mein pucho... 🌸`}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={handleKey}
                rows={2}
                maxLength={2000}
                aria-label="Chat message input"
              />
              <button
                className="send-btn"
                onClick={sendChat}
                disabled={chatLoading || !chatInput.trim()}
                aria-label="Send message"
              >
                {chatLoading ? <span className="spinner"/> : <span>➤</span>}
              </button>
            </div>
            <p className="chat-hint">Enter = Send · Shift+Enter = New line · Max 2000 chars</p>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <span>🌸 AmanAI</span>
          <span>·</span>
          <span>Powered by Pollinations AI</span>
          <span>·</span>
          <span>22 Indian Languages</span>
          <span>·</span>
          <span>100% Free & Secure</span>
          <span>·</span>
          <span>🔒 No Data Stored</span>
        </div>
      </footer>
    </div>
  );
}
