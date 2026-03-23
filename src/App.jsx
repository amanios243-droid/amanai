import { useState, useRef, useEffect, useCallback, memo } from "react";
import "./App.css";

const sanitize = (str) => {
  if (typeof str !== "string") return "";
  return str.replace(/[<>]/g,"").replace(/javascript:/gi,"").replace(/on\w+=/gi,"").trim().slice(0,2000);
};
const rateLimit = (() => {
  const map = {};
  return (key, max, ms) => {
    const now = Date.now();
    if (!map[key]) map[key] = [];
    map[key] = map[key].filter(t => now - t < ms);
    if (map[key].length >= max) return false;
    map[key].push(now); return true;
  };
})();

// ── API KEYS ──
const GEMINI_KEYS = [
  "AIzaSyCqpA55Py4WCR5fjXLUxNx1dsHeuyUY-Ys",
  "AIzaSyDs4uN2dzg0qAaWw-xuhkUClGGzo6H6GlE",
  "AIzaSyBi8qVLnAp3WsBnrSq32eYtrmb2ZXpniic",
];
const GROQ_KEYS = [
  "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",
  "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",
  "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",
];
const OR_KEYS = [
  "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",
  "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",
];
const HF_KEYS = [
  "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",
  "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",
  "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",
];

const ki = {};
const getKey = (keys, name) => {
  if (!keys.length) return null;
  if (ki[name] === undefined) ki[name] = 0;
  const k = keys[ki[name] % keys.length];
  ki[name]++;
  return k;
};

// ── LANGUAGES ──
const LANGUAGES = [
  { code:"hi", name:"हिंदी", label:"Hindi" },
  { code:"en", name:"English", label:"English" },
  { code:"hinglish", name:"Hinglish", label:"Hinglish" },
  { code:"bn", name:"বাংলা", label:"Bengali" },
  { code:"te", name:"తెలుగు", label:"Telugu" },
  { code:"mr", name:"मराठी", label:"Marathi" },
  { code:"ta", name:"தமிழ்", label:"Tamil" },
  { code:"gu", name:"ગુજરાતી", label:"Gujarati" },
  { code:"kn", name:"ಕನ್ನಡ", label:"Kannada" },
  { code:"ml", name:"മലയാളം", label:"Malayalam" },
  { code:"pa", name:"ਪੰਜਾਬੀ", label:"Punjabi" },
  { code:"or", name:"ଓଡ଼ିଆ", label:"Odia" },
  { code:"as", name:"অসমীয়া", label:"Assamese" },
  { code:"ur", name:"اردو", label:"Urdu" },
  { code:"sa", name:"संस्कृत", label:"Sanskrit" },
  { code:"mai", name:"मैथिली", label:"Maithili" },
  { code:"bho", name:"भोजपुरी", label:"Bhojpuri" },
  { code:"raj", name:"राजस्थानी", label:"Rajasthani" },
  { code:"ks", name:"کشمیری", label:"Kashmiri" },
  { code:"ne", name:"नेपाली", label:"Nepali" },
  { code:"sd", name:"سنڌي", label:"Sindhi" },
  { code:"kok", name:"कोंकणी", label:"Konkani" },
];

const LANG_SYSTEM = {
  hi:"तुम AmanAI हो — एक बेहतरीन, दोस्ताना और मददगार AI। हमेशा हिंदी में जवाब दो।",
  en:"You are AmanAI — a smart, friendly AI. Always respond in English. Be concise.",
  hinglish:"Tu AmanAI hai — ek smart aur helpful AI. Hamesha Hinglish mein baat kar. Short jawab de.",
  bn:"তুমি AmanAI — স্মার্ট AI। সবসময় বাংলায় উত্তর দাও।",
  te:"మీరు AmanAI — తెలివైన AI. తెలుగులో సమాధానం ఇవ్వండి.",
  mr:"तू AmanAI — हुशार AI. मराठीत उत्तर दे.",
  ta:"நீங்கள் AmanAI — புத்திசாலி AI. தமிழில் பதில் சொல்லுங்கள்.",
  gu:"તમે AmanAI — સ્માર્ટ AI. ગુજરાતીમાં જવાબ આપો.",
  kn:"ನೀವు AmanAI — ಬುದ್ಧಿವಂತ AI. ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ.",
  ml:"നിങ്ങൾ AmanAI — സ്മാർട്ട് AI. മലയാളത്തിൽ ഉത്തരം നൽകൂ.",
  pa:"ਤੁਸੀਂ AmanAI — ਸਮਝਦਾਰ AI. ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦਿਓ।",
  or:"ତୁମେ AmanAI — ସ୍ମାର୍ଟ AI। ଓଡ଼ିଆରେ ଉତ୍ତର ଦିଅ।",
  as:"তুমি AmanAI — স্মাৰ্ট AI। অসমীয়াত উত্তৰ দিয়া।",
  ur:"آپ AmanAI — ذہین AI۔ اردو میں جواب دیں۔",
  sa:"भवान् AmanAI — बुद्धिमान् AI। संस्कृते उत्तरं ददातु।",
  mai:"अहाँ AmanAI — चतुर AI। मैथिली में जवाब दी।",
  bho:"रउरा AmanAI — चतुर AI। भोजपुरी में जवाब दीं।",
  raj:"थे AmanAI — चतुर AI। राजस्थानी में जवाब दो।",
  ks:"تۄہِ AmanAI — ذہین AI۔ کشمیری میں جواب دیو۔",
  ne:"तपाईं AmanAI — स्मार्ट AI। नेपालीमा जवाफ दिनुस्।",
  sd:"توهان AmanAI — ذهين AI. سنڌيءَ ۾ جواب ڏيو.",
  kok:"तुम AmanAI — हुशार AI। कोंकणींत जाप दी.",
};

// ── IMAGE CONFIG ──
const IMG_MODELS = [
  { id:"flux", name:"FLUX", tag:"Best" },
  { id:"flux-realism", name:"Realism", tag:"Ultra HD" },
  { id:"flux-anime", name:"Anime", tag:"Anime" },
  { id:"flux-3d", name:"3D", tag:"3D" },
  { id:"turbo", name:"Turbo", tag:"⚡Fast" },
];
const STYLES = [
  { label:"Auto", value:"", emoji:"✨" },
  { label:"Photorealistic", value:"photorealistic, ultra detailed, 8k, sharp focus", emoji:"📷" },
  { label:"Cinematic", value:"cinematic shot, dramatic lighting, film grain", emoji:"🎬" },
  { label:"Anime", value:"anime style, vibrant colors, manga art", emoji:"🎌" },
  { label:"Oil Painting", value:"oil painting, textured canvas, masterpiece", emoji:"🖼️" },
  { label:"Watercolor", value:"watercolor painting, soft edges, artistic", emoji:"🎨" },
  { label:"Cyberpunk", value:"cyberpunk, neon lights, futuristic city", emoji:"🌆" },
  { label:"Fantasy", value:"fantasy art, magical, ethereal glow, epic", emoji:"🧙" },
  { label:"Sketch", value:"pencil sketch, hand drawn, detailed linework", emoji:"✏️" },
  { label:"Digital Art", value:"digital art, concept art, highly detailed", emoji:"💻" },
  { label:"Vintage", value:"vintage photography, retro, film noir", emoji:"📸" },
  { label:"Minimalist", value:"minimalist, clean, simple, modern design", emoji:"◻️" },
];
const SIZES = [
  { label:"Fast 512px", width:512, height:512, icon:"⚡" },
  { label:"Portrait", width:512, height:768, icon:"📱" },
  { label:"Landscape", width:768, height:512, icon:"🖥️" },
  { label:"Wide 16:9", width:768, height:432, icon:"📺" },
  { label:"HD 1024px", width:1024, height:1024, icon:"🌟" },
];

// ── CHAT API ──
async function chatAPI(messages, langCode) {
  const system = LANG_SYSTEM[langCode] || LANG_SYSTEM["hinglish"];
  const msgs = messages.slice(-20).map(m => ({ role:m.role, content:m.content }));

  // 1. Gemini Flash (fastest)
  for (let attempt = 0; attempt < GEMINI_KEYS.length; attempt++) {
    const key = getKey(GEMINI_KEYS, "gemini");
    try {
      const geminiMsgs = msgs.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            systemInstruction:{ parts:[{ text: system + " Apna naam AmanAI hai. Helpful aur concise raho." }]},
            contents: geminiMsgs,
            generationConfig:{ maxOutputTokens:1024, temperature:0.7 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply && reply.length > 2) return reply.trim();
      }
    } catch(_) {}
  }

  // 2. Groq (very fast)
  for (let attempt = 0; attempt < GROQ_KEYS.length; attempt++) {
    const key = getKey(GROQ_KEYS, "groq");
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},
        body: JSON.stringify({
          model:"llama3-8b-8192",
          messages:[
            { role:"system", content: system + " Apna naam AmanAI hai." },
            ...msgs
          ],
          max_tokens:1024, temperature:0.7,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) return reply.trim();
      }
    } catch(_) {}
  }

  // 3. OpenRouter
  for (let attempt = 0; attempt < OR_KEYS.length; attempt++) {
    const key = getKey(OR_KEYS, "or");
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},
        body: JSON.stringify({
          model:"meta-llama/llama-3.1-8b-instruct:free",
          messages:[{ role:"system", content:system }, ...msgs],
          max_tokens:1024,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) return reply.trim();
      }
    } catch(_) {}
  }

  // 4. Pollinations fallback
  try {
    const lastMsg = msgs[msgs.length-1]?.content || "";
    const res = await fetch(
      `https://text.pollinations.ai/${encodeURIComponent(lastMsg.slice(0,400))}?model=openai&system=${encodeURIComponent(system.slice(0,150))}&seed=${Math.floor(Math.random()*9999)}`,
      { method:"GET" }
    );
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 5 && !text.includes("<!DOCTYPE")) return text.trim();
    }
  } catch(_) {}

  return "Thodi der ke liye busy hoon. Dobara try karo! 🙏";
}

// ── PROMPT ENHANCER ──
async function enhancePrompt(rawPrompt, style) {
  const styleHint = style ? `Style: ${style}.` : "";
  const enhanceText = `Convert to detailed image generation prompt in English. ${styleHint} Add lighting, mood, composition. Max 120 words. Return ONLY the prompt: ${rawPrompt}`;

  // Try Gemini first
  const gKey = getKey(GEMINI_KEYS, "g_enhance");
  if (gKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${gKey}`,
        {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            contents:[{ parts:[{ text: enhanceText }] }],
            generationConfig:{ maxOutputTokens:200 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.length > 10) return text.trim();
      }
    } catch(_) {}
  }

  // Groq fallback
  const gqKey = getKey(GROQ_KEYS, "gq_enhance");
  if (gqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${gqKey}`},
        body: JSON.stringify({
          model:"llama3-8b-8192",
          messages:[
            { role:"system", content:"You are an image prompt expert. Return ONLY the enhanced prompt in English, max 120 words." },
            { role:"user", content: enhanceText }
          ],
          max_tokens:200,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text.trim();
      }
    } catch(_) {}
  }

  return rawPrompt;
}

// ── IMAGE GENERATION ──
async function generateImageURL(prompt, model, size, style) {
  const styleStr = style ? `, ${style}` : "";
  const fullPrompt = `${prompt}${styleStr}, masterpiece, best quality, highly detailed`;
  const seed = Math.floor(Math.random() * 9999999);
  const polUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?model=${model}&width=${size.width}&height=${size.height}&seed=${seed}&nologo=true&nofeed=true`;

  // Try Pollinations with 2 attempts
  for (let i = 0; i < 2; i++) {
    const tryUrl = i === 0 ? polUrl : polUrl.replace(/seed=\d+/, `seed=${Math.floor(Math.random()*9999999)}`);
    try {
      await new Promise((resolve, reject) => {
        const img = new window.Image();
        const t = setTimeout(() => reject(new Error("timeout")), 45000);
        img.onload = () => { clearTimeout(t); resolve(); };
        img.onerror = () => { clearTimeout(t); reject(); };
        img.src = tryUrl;
      });
      return tryUrl;
    } catch(_) {
      if (i === 0) await new Promise(r => setTimeout(r, 2000));
    }
  }

  // HF fallback
  const hfKey = getKey(HF_KEYS, "hf");
  if (hfKey) {
    try {
      const res = await fetch(
        "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
        {
          method:"POST",
          headers:{"Authorization":`Bearer ${hfKey}`,"Content-Type":"application/json"},
          body: JSON.stringify({ inputs: fullPrompt, parameters:{ width:size.width, height:size.height }}),
        }
      );
      if (res.ok) {
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      }
    } catch(_) {}
  }

  throw new Error("Image nahi ban payi. Dobara try karo!");
}

// ── COMPONENTS ──
const TypingDots = memo(() => (
  <div className="typing-dots"><span/><span/><span/></div>
));

const ImageCard = memo(({ img, index, onDownload }) => {
  if (img.loading) return (
    <div className="img-card loading-card">
      <div className="img-shimmer">
        <div className="shimmer-orb"/>
        <p className="shimmer-text">Imagination se ban rahi hai ✨</p>
        <div className="shimmer-bar"/><div className="shimmer-bar short"/>
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
        <img src={img.url} alt={`AmanAI ${index+1}`} className="gen-img" loading="lazy"/>
        <div className="img-overlay">
          <button className="overlay-btn" onClick={() => onDownload(img,index)}>⬇ Download</button>
          <button className="overlay-btn" onClick={() => window.open(img.url,"_blank")}>🔍 Full Size</button>
          <button className="overlay-btn" onClick={() => navigator.clipboard.writeText(img.enhancedPrompt||img.prompt)}>📋 Prompt</button>
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

// ── MAIN APP ──
export default function App() {
  const [tab, setTab] = useState("image");
  const [lang, setLang] = useState("hinglish");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [imgPrompt, setImgPrompt] = useState("");
  const [imgModel, setImgModel] = useState("turbo");
  const [imgStyle, setImgStyle] = useState("");
  const [imgSize, setImgSize] = useState(SIZES[0]);
  const [imgCount, setImgCount] = useState(1);
  const [useEnhancer, setUseEnhancer] = useState(true);
  const [images, setImages] = useState([]);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState("");
  const [genIndex, setGenIndex] = useState(null);
  const [enhancing, setEnhancing] = useState(false);
  const [messages, setMessages] = useState([
    { role:"assistant", content:"Salam! Main AmanAI hoon 🌸 Tumhara personal AI — image bhi banata hoon, baat bhi karta hoon! Kuch bhi pucho, kisi bhi Indian language mein! 😊" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef(null);
  const langMenuRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, chatLoading]);

  useEffect(() => {
    const h = (e) => { if (langMenuRef.current && !langMenuRef.current.contains(e.target)) setShowLangMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const generateImage = useCallback(async () => {
    const cleanPrompt = sanitize(imgPrompt);
    if (!cleanPrompt) return setImgError("Prompt likho pehle!");
    if (!rateLimit("img",10,60000)) return setImgError("Thoda ruko! 60 sec baad try karo.");
    setImgLoading(true); setImgError("");
    const newImgs = Array(imgCount).fill(null).map((_,i) => ({ id:Date.now()+i, loading:true, url:null, prompt:cleanPrompt }));
    setImages(prev => [...newImgs, ...prev]);
    for (let i = 0; i < imgCount; i++) {
      setGenIndex(i+1);
      try {
        let finalPrompt = cleanPrompt;
        if (useEnhancer) { setEnhancing(true); finalPrompt = sanitize(await enhancePrompt(cleanPrompt, imgStyle)); setEnhancing(false); }
        const url = await generateImageURL(finalPrompt, imgModel, imgSize, imgStyle);
        setImages(prev => prev.map(x => x.id===newImgs[i].id ? {...x, loading:false, url, prompt:cleanPrompt, enhancedPrompt:finalPrompt} : x));
      } catch(err) {
        setEnhancing(false);
        setImages(prev => prev.map(x => x.id===newImgs[i].id ? {...x, loading:false, error:err.message} : x));
        setImgError(`Image ${i+1}: ${err.message}`);
      }
    }
    setImgLoading(false); setGenIndex(null); setEnhancing(false);
  }, [imgPrompt, imgStyle, imgModel, imgSize, imgCount, useEnhancer]);

  const downloadImg = useCallback((img, i) => {
    const a = document.createElement("a");
    a.href=img.url; a.target="_blank"; a.download=`AmanAI-${i+1}-${Date.now()}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }, []);

  const sendChat = useCallback(async () => {
    const text = sanitize(chatInput);
    if (!text || chatLoading) return;
    if (!rateLimit("chat",20,60000)) return setMessages(prev => [...prev, { role:"assistant", content:"Thoda ruko! 1 minute baad try karo. 🙏" }]);
    const newMsgs = [...messages, { role:"user", content:text }];
    setMessages(newMsgs); setChatInput(""); setChatLoading(true);
    try {
      const reply = await chatAPI(newMsgs, lang);
      setMessages(prev => [...prev, { role:"assistant", content:sanitize(reply) }]);
    } catch(_) {
      setMessages(prev => [...prev, { role:"assistant", content:"Thodi der ke liye busy hoon. Dobara try karo! 🙏" }]);
    }
    setChatLoading(false);
  }, [chatInput, chatLoading, messages, lang]);

  const handleKey = (e) => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } };
  const currentLang = LANGUAGES.find(l => l.code===lang);

  return (
    <div className="app">
      <div className="bg-mesh" aria-hidden="true">
        <div className="blob b1"/><div className="blob b2"/><div className="blob b3"/>
        <div className="grid-overlay"/>
      </div>
      <header className="header">
        <div className="brand">
          <div className="brand-logo"><span className="logo-letter">A</span><div className="logo-ring"/></div>
          <div className="brand-text">
            <h1 className="brand-name">Aman<span>AI</span></h1>
            <p className="brand-tagline">India's Personal AI · Free & Unlimited</p>
          </div>
        </div>
        <div className="header-right">
          <div className="lang-selector" ref={langMenuRef}>
            <button className="lang-btn" onClick={() => setShowLangMenu(v=>!v)}>
              <span>🌐</span><span className="lang-current">{currentLang?.name}</span><span className="lang-arrow">{showLangMenu?"▲":"▼"}</span>
            </button>
            {showLangMenu && (
              <div className="lang-dropdown">
                <div className="lang-dropdown-title">🇮🇳 22 Indian Languages</div>
                <div className="lang-grid">
                  {LANGUAGES.map(l => (
                    <button key={l.code} className={`lang-option ${lang===l.code?"active":""}`} onClick={() => { setLang(l.code); setShowLangMenu(false); }}>
                      <span className="lang-native">{l.name}</span><span className="lang-label">{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="header-badges">
            <span className="hbadge">✨ Free</span><span className="hbadge">🔒 Secure</span><span className="hbadge">🌸 Premium</span>
          </div>
        </div>
      </header>

      <nav className="tabs">
        <button className={`tab ${tab==="image"?"active":""}`} onClick={() => setTab("image")}>
          <span className="tab-icon">🎨</span><span>Image Generator</span>
        </button>
        <button className={`tab ${tab==="chat"?"active":""}`} onClick={() => setTab("chat")}>
          <span className="tab-icon">💬</span><span>AI Chat</span>
          {messages.length > 1 && <span className="tab-badge">{messages.filter(m=>m.role==="assistant").length}</span>}
        </button>
      </nav>

      {tab==="image" && (
        <main className="main">
          <div className="card prompt-card">
            <label className="label">✍️ Apni Imagination Describe Karo<span className="label-hint">Kuch bhi likho — AI usse amazing image mein badlega</span></label>
            <textarea className="textarea"
              placeholder="Kuch bhi describe karo... jaise: 'ek sher aur lion ki dosti sunset mein' ya 'Taj Mahal at night with aurora borealis'"
              value={imgPrompt} onChange={e => { setImgPrompt(e.target.value); setImgError(""); }} rows={4} maxLength={2000}
            />
            <div className="prompt-footer">
              <span className="char-count">{imgPrompt.length}/2000</span>
              <label className="enhancer-toggle">
                <input type="checkbox" checked={useEnhancer} onChange={e => setUseEnhancer(e.target.checked)}/>
                <span className="toggle-track"><span className="toggle-thumb"/></span>
                <span className="toggle-label">🧠 Imagination Enhancer {useEnhancer?"ON":"OFF"}</span>
              </label>
            </div>
            {useEnhancer && <div className="enhancer-info">💡 Tumhari simple description AI se ultra-detailed prompt mein badlti hai — results 10x better!</div>}
          </div>

          <div className="card">
            <label className="label">🤖 AI Model</label>
            <div className="model-grid">
              {IMG_MODELS.map(m => (
                <button key={m.id} className={`model-btn ${imgModel===m.id?"active":""}`} onClick={() => setImgModel(m.id)}>
                  <span className="model-name">{m.name}</span><span className="model-tag">{m.tag}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <label className="label">🎨 Art Style</label>
            <div className="style-grid">
              {STYLES.map(s => (
                <button key={s.label} className={`style-btn ${imgStyle===s.value?"active":""}`} onClick={() => setImgStyle(s.value)}>
                  <span>{s.emoji}</span><span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card two-col">
            <div>
              <label className="label">📐 Image Size</label>
              <div className="size-btns">
                {SIZES.map(s => (
                  <button key={s.label} className={`size-btn ${JSON.stringify(imgSize)===JSON.stringify(s)?"active":""}`} onClick={() => setImgSize(s)}>
                    <span>{s.icon}</span><span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">🔢 Kitni Images: <strong className="count-num">{imgCount}</strong></label>
              <input type="range" min={1} max={4} value={imgCount} onChange={e => setImgCount(+e.target.value)} className="slider"/>
              <div className="slider-labels">{[1,2,3,4].map(n=><span key={n} className={imgCount>=n?"active":""}>{n}</span>)}</div>
            </div>
          </div>

          {imgError && <div className="error-box">⚠️ {imgError}</div>}

          <button className="gen-btn" onClick={generateImage} disabled={imgLoading}>
            {imgLoading
              ? <span className="btn-inner"><span className="spinner"/>{enhancing?"🧠 AI prompt enhance kar raha hai...":`🌸 Image ${genIndex}/${imgCount} ban rahi hai...`}</span>
              : <span className="btn-inner">🌸 Generate {imgCount>1?`${imgCount} Images`:"Image"}{useEnhancer&&<span className="btn-badge">+ AI Enhance</span>}</span>
            }
          </button>

          {images.length > 0 && (
            <section className="gallery-section">
              <div className="gallery-hdr">
                <h2>🖼️ Generated Images <span className="gallery-count">({images.length})</span></h2>
                <button className="clear-btn" onClick={() => setImages([])}>🗑️ Clear All</button>
              </div>
              <div className="gallery">
                {images.map((img,i) => <ImageCard key={img.id} img={img} index={i} onDownload={downloadImg}/>)}
              </div>
            </section>
          )}
        </main>
      )}

      {tab==="chat" && (
        <section className="chat-wrap">
          <div className="chat-lang-bar">
            <span>🌐 Language:</span>
            <strong>{currentLang?.name} ({currentLang?.label})</strong>
            <button className="change-lang-btn" onClick={() => setShowLangMenu(true)}>Change ▼</button>
          </div>
          <div className="chat-messages" role="log" aria-live="polite">
            {messages.map((m,i) => (
              <div key={i} className={`msg ${m.role}`}>
                {m.role==="assistant" && <div className="msg-avatar">A</div>}
                <div className="msg-bubble"><div className="msg-content">{m.content}</div></div>
                {m.role==="user" && <div className="msg-avatar user-av">👤</div>}
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
              <textarea className="chat-input"
                placeholder={`${currentLang?.name} mein pucho... 🌸`}
                value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={handleKey} rows={2} maxLength={2000}
              />
              <button className="send-btn" onClick={sendChat} disabled={chatLoading||!chatInput.trim()}>
                {chatLoading ? <span className="spinner"/> : <span>➤</span>}
              </button>
            </div>
            <p className="chat-hint">Enter = Send · Shift+Enter = New line</p>
          </div>
        </section>
      )}

      <footer className="footer">
        <div className="footer-inner">
          <span>🌸 AmanAI</span><span>·</span>
          <span>Gemini + Groq + OpenRouter</span><span>·</span>
          <span>22 Indian Languages</span><span>·</span>
          <span>🔒 Secure & Fast</span>
        </div>
      </footer>
    </div>
  );
}
