import React, { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    signInWithCustomToken,
    signInAnonymously,
    User
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    limit,
    DocumentData,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    deleteDoc,
    orderBy
} from 'firebase/firestore';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer, 
    PieChart, 
    Pie, 
    Cell,
    TooltipProps
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldQuestion, BarChart3, LogOut, ArrowRight, Check, AlertTriangle, Loader2, Sparkles, Send, Mic, Map, FileText, Swords, BookOpen, Palette } from 'lucide-react';

// Workaround for Framer Motion TypeScript error in React 18
const SafeAnimatePresence = AnimatePresence as any;

// ============================================================================
// ⚠️ GEMINI API CONFIGURATION ⚠️
// ============================================================================
const GEMINI_API_KEY = ""your_key_here""; 


// --- TypeScript Declarations for Global Variables & Speech Recognition ---
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
        __firebase_config?: string;
        __initial_auth_token?: string;
        __app_id?: string;
    }
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    onresult: (event: any) => void;
    onerror: (event: any) => void;
    onend: () => void;
}


// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "your_key_here",
  authDomain: "veritas-web-8cffd.firebaseapp.com",
  projectId: "veritas-web-8cffd",
  storageBucket: "veritas-web-8cffd.firebasestorage.app",
  messagingSenderId: "666526332028",
  appId: "1:666526332028:web:adc25dc2f658e0e1b345f9",
  measurementId: "G-23E76TYPXZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Type Definitions ---
interface AuthContextType {
    user: (User & DocumentData) | null;
    loading: boolean;
    error: string | null;
}

interface Message {
    sender: 'user' | 'ai' | 'opponent' | 'moderator';
    text: string;
    timestamp?: any;
}

interface Topic {
    id: string;
    title: string;
    isActive: boolean;
}

// --- Authentication Context ---
const AuthContext = createContext<AuthContextType | null>(null);
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [user, setUser] = useState<(User & DocumentData) | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setError(null);
            if (user) {
                try {
                    const userDocRef = doc(db, "users", user.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        setUser({ ...user, ...userDoc.data() });
                    } else {
                        setUser(user);
                    }
                } catch (err: any) {
                    console.error("Permission error fetching user document.", err);
                    if(err.code === 'permission-denied' || err.code === 'storage/unauthorized') {
                        setError("Could not load user profile. This is likely due to incorrect Firebase security rules.");
                    }
                    setUser(user);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        const attemptSignIn = async () => {
            try {
                if (typeof window !== 'undefined' && window.__initial_auth_token) {
                    try {
                        await signInWithCustomToken(auth, window.__initial_auth_token);
                    } catch (tokenErr) { }
                } 
                if (!auth.currentUser) {
                    try {
                        await signInAnonymously(auth);
                    } catch (anonErr) { }
                }
            } catch (error) {
                console.warn("Auto sign-in logic skipped. Proceeding to manual login.");
            }
        };
        
        attemptSignIn();
        return () => unsubscribe();
    }, []);

    const value = { user, loading, error };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================================================
// 🎨 DYNAMIC THEMING ENGINE
// ============================================================================

const THEMES = [
    {
        id: 'aurora',
        name: 'Cyber Aurora',
        desc: 'Deep space cyan & fuchsia',
        bgBase: 'bg-[#030014]',
        orb1: 'bg-violet-600/20',
        orb2: 'bg-cyan-600/10',
        orb3: 'bg-fuchsia-600/10',
        textGrad: 'from-cyan-400 via-indigo-400 to-fuchsia-400',
        textPrimary: 'text-cyan-400',
        textSecondary: 'text-fuchsia-400',
        borderPrimary: 'border-cyan-500/30',
        borderSecondary: 'border-fuchsia-500/30',
        bgPrimaryGlow: 'bg-cyan-500/10',
        bgSecondaryGlow: 'bg-fuchsia-500/10',
        buttonSecondary: 'from-cyan-500 to-indigo-600',
        spinner: 'text-cyan-400',
        logoGrad: ['#00F0FF', '#FF007A'],
        pieColors: ['#00F0FF', '#FF007A', '#7000FF', '#00FF9D', '#FFB800'],
        barGradient: ['#00F0FF', '#7000FF']
    },
    {
        id: 'matrix',
        name: 'Neural Matrix',
        desc: 'Hacker emerald & lime',
        bgBase: 'bg-[#000A05]',
        orb1: 'bg-emerald-600/20',
        orb2: 'bg-green-600/10',
        orb3: 'bg-lime-600/10',
        textGrad: 'from-emerald-400 via-green-400 to-lime-400',
        textPrimary: 'text-emerald-400',
        textSecondary: 'text-lime-400',
        borderPrimary: 'border-emerald-500/30',
        borderSecondary: 'border-lime-500/30',
        bgPrimaryGlow: 'bg-emerald-500/10',
        bgSecondaryGlow: 'bg-lime-500/10',
        buttonSecondary: 'from-emerald-500 to-green-600',
        spinner: 'text-emerald-400',
        logoGrad: ['#10B981', '#A3E635'],
        pieColors: ['#10B981', '#A3E635', '#22C55E', '#059669', '#bef264'],
        barGradient: ['#10B981', '#059669']
    },
    {
        id: 'solar',
        name: 'Solar Flare',
        desc: 'Plasma orange & crimson',
        bgBase: 'bg-[#0a0300]',
        orb1: 'bg-orange-600/20',
        orb2: 'bg-red-600/10',
        orb3: 'bg-yellow-600/10',
        textGrad: 'from-orange-400 via-red-400 to-yellow-400',
        textPrimary: 'text-orange-400',
        textSecondary: 'text-red-400',
        borderPrimary: 'border-orange-500/30',
        borderSecondary: 'border-red-500/30',
        bgPrimaryGlow: 'bg-orange-500/10',
        bgSecondaryGlow: 'bg-red-500/10',
        buttonSecondary: 'from-orange-500 to-red-600',
        spinner: 'text-orange-400',
        logoGrad: ['#F97316', '#EF4444'],
        pieColors: ['#F97316', '#EF4444', '#EAB308', '#F59E0B', '#DC2626'],
        barGradient: ['#F97316', '#DC2626']
    },
    {
        id: 'frost',
        name: 'Quantum Frost',
        desc: 'Sub-zero ice blue & sky',
        bgBase: 'bg-[#000814]',
        orb1: 'bg-blue-600/20',
        orb2: 'bg-sky-600/10',
        orb3: 'bg-indigo-600/10',
        textGrad: 'from-sky-400 via-blue-400 to-indigo-400',
        textPrimary: 'text-sky-400',
        textSecondary: 'text-blue-400',
        borderPrimary: 'border-sky-500/30',
        borderSecondary: 'border-blue-500/30',
        bgPrimaryGlow: 'bg-sky-500/10',
        bgSecondaryGlow: 'bg-blue-500/10',
        buttonSecondary: 'from-sky-500 to-indigo-600',
        spinner: 'text-sky-400',
        logoGrad: ['#38BDF8', '#4F46E5'],
        pieColors: ['#38BDF8', '#4F46E5', '#60A5FA', '#818CF8', '#93C5FD'],
        barGradient: ['#38BDF8', '#4F46E5']
    }
];

const ThemeContext = createContext<any>(null);
const useTheme = () => useContext(ThemeContext);

const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [activeThemeId, setActiveThemeId] = useState('aurora');
    const theme = THEMES.find(t => t.id === activeThemeId) || THEMES[0];
    
    return (
        <ThemeContext.Provider value={{ theme, setActiveThemeId, themes: THEMES }}>
            {children}
        </ThemeContext.Provider>
    );
};

// --- Futuristic Sample Data & Dictionary ---

const SAMPLE_CHART_DATA = {
    isSample: true,
    fallacyData: [
        { name: 'Ad Hominem', count: 8 },
        { name: 'Straw Man', count: 12 },
        { name: 'Slippery Slope', count: 5 },
        { name: 'False Dichotomy', count: 9 },
    ],
    biasData: [
        { name: 'Confirmation Bias', value: 35 },
        { name: 'Anchoring Bias', value: 25 },
        { name: 'Survivorship Bias', value: 20 },
        { name: 'Bandwagon Effect', value: 20 },
    ]
};

const COMMON_DICTIONARY: Record<string, { type: string, definition: string, example: string }> = {
    "Ad Hominem": { type: "Logical Fallacy", definition: "Attacking the opponent's character or personal traits instead of engaging with their actual argument.", example: "You don't even have a degree in computer science, so your opinion on AI regulation is invalid." },
    "Straw Man": { type: "Logical Fallacy", definition: "Exaggerating, misrepresenting, or completely fabricating someone's argument to make it easier to attack.", example: "Opponent: 'We should fund schools better.' User: 'So you want to bankrupt the country by throwing money at lazy teachers?'" },
    "Slippery Slope": { type: "Logical Fallacy", definition: "Asserting that a relatively small first step will inevitably lead to a chain of related (and highly negative) events.", example: "If we regulate AI slightly, next the government will ban calculators and we will be back in the Stone Age." },
    "False Dichotomy": { type: "Logical Fallacy", definition: "Presenting only two alternative states as the only possibilities, when in fact more possibilities exist.", example: "You either completely support unregulated AI, or you are an enemy of technological progress." },
    "Moving the Goalposts": { type: "Logical Fallacy", definition: "Changing the criteria or rules for proof as soon as the opponent successfully fulfills the original criteria.", example: "Okay, maybe AI can pass the Bar Exam, but it can't feel human love, so it's not truly intelligent." },
    "Appeal to Emotion": { type: "Logical Fallacy", definition: "Manipulating an emotional response (fear, pity, joy) in place of a valid or compelling logical argument.", example: "Think of the poor children who will be terrified by AI robots; we must ban them immediately!" },
    "Hasty Generalization": { type: "Logical Fallacy", definition: "Jumping to a massive conclusion based on a very small or unrepresentative sample size.", example: "My teenager is addicted to TikTok, therefore all social media destroys the youth." },
    "Begging the Question": { type: "Logical Fallacy", definition: "Circular reasoning. You try to prove a point by assuming the point is already true in your premise.", example: "Social media is a toxic platform because it is full of toxic social media." },
    "False Dilemma": { type: "Logical Fallacy", definition: "Very similar to False Dichotomy. Pretending there are only two extreme options when a middle ground exists.", example: "Either we ban cellphones completely, or we accept that teenagers will fail school." },
    
    "Confirmation Bias": { type: "Cognitive Bias", definition: "The tendency to search for, interpret, favor, and recall information in a way that confirms one's preexisting beliefs.", example: "The user only cites statistics that show social media is good, completely ignoring the AI's data regarding cyberbullying." },
    "Anchoring Bias": { type: "Cognitive Bias", definition: "Relying too heavily on the first piece of information offered (the 'anchor') when making decisions.", example: "The user continues to base their entire argument on a single statistic they mentioned in their opening thesis, even after it is disproven." },
    "Survivorship Bias": { type: "Cognitive Bias", definition: "Concentrating on the people or things that 'survived' a process and overlooking those that did not.", example: "Steve Jobs dropped out of college and became a billionaire, so formal education is a waste of time." },
    "Bandwagon Effect": { type: "Cognitive Bias", definition: "The tendency to do or believe things because many other people do or believe the same.", example: "Everyone on Twitter agrees that this new policy is terrible, so it must be completely flawed." },
    "Positive Framing (Optimism Bias)": { type: "Cognitive Bias", definition: "The tendency to overestimate the likelihood of positive events and ignore obvious negative externalities.", example: "The user argues that AI will automate all jobs and lead to a utopia, deliberately ignoring the economic transition period." },
    "Optimism Bias": { type: "Cognitive Bias", definition: "The tendency to overestimate the likelihood of positive events and ignore obvious negative externalities.", example: "The user argues that AI will automate all jobs and lead to a utopia, deliberately ignoring the economic transition period." },
    "Definitional Precondition Bias": { type: "Cognitive Bias", definition: "A debate avoidance tactic where a user demands impossibly strict definitions of basic terms before agreeing to engage in the actual argument.", example: "Before we can discuss 'Global Warming', you must define exactly what 'warm' means on a cosmic scale." },
    "Availability Heuristic": { type: "Cognitive Bias", definition: "Believing something is highly common just because it is easy to remember or you saw it recently in the news.", example: "Assuming airplane crashes happen constantly just because one was on the news yesterday, even though driving is statistically more dangerous." },
    "Framing Effect": { type: "Cognitive Bias", definition: "Changing your opinion based purely on how information is presented, rather than the facts themselves.", example: "Choosing a surgery with a '90% survival rate' but rejecting the same surgery when told it has a '10% mortality rate'." },
    "Motivated Reasoning": { type: "Cognitive Bias", definition: "Thinking backward. You decide what you want the answer to be first, and then you twist the evidence to fit your desired conclusion.", example: "Ignoring 5 studies that prove you wrong, but accepting 1 flawed study because it agrees with your original thesis." }
};

// --- Custom "Veritas Prism" Logo ---
const VeritasLogo = () => {
    const { theme } = useTheme();
    return (
        <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${theme.textGrad} shadow-[0_0_20px_rgba(255,255,255,0.1)] p-[1px] overflow-hidden transition-all duration-1000`}>
            <div className="absolute inset-0 bg-white/20 blur-md mix-blend-overlay"></div>
            <div className="w-full h-full bg-[#05050a] rounded-xl flex items-center justify-center z-10">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 12L12 22L22 12L12 2Z" stroke="url(#diamond-grad)" strokeWidth="2" strokeLinejoin="round"/>
                    <path d="M2 12H22" stroke="url(#diamond-grad)" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M12 2V22" stroke="url(#diamond-grad)" strokeWidth="2" strokeLinecap="round"/>
                    <defs>
                        <linearGradient id="diamond-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                            <stop stopColor={theme.logoGrad[0]}/>
                            <stop offset="1" stopColor={theme.logoGrad[1]}/>
                        </linearGradient>
                    </defs>
                </svg>
            </div>
        </div>
    );
};


// --- Next-Gen UI Components ---

const Button: React.FC<{
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
}> = ({ children, onClick, className = '', variant = 'primary', type = 'button', disabled = false }) => {
    const { theme } = useTheme();
    const baseClasses = 'px-6 py-3 rounded-full font-bold text-sm tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 focus:outline-none';
    const variantClasses = {
        primary: 'bg-white text-black hover:bg-gray-200 shadow-[0_0_20px_rgba(255,255,255,0.2)]', 
        secondary: `bg-gradient-to-r ${theme.buttonSecondary} text-white hover:opacity-90 shadow-lg`,
        danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20',
        glass: 'bg-white/[0.05] text-gray-300 hover:bg-white/[0.1] hover:text-white border border-white/10 backdrop-blur-md',
        ghost: 'bg-transparent text-gray-400 hover:text-white shadow-none',
    };
    const disabledClasses = 'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none';
    return (
        <motion.button
            whileHover={{ y: disabled ? 0 : -2, scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 0.98 }}
            type={type}
            onClick={onClick}
            className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}
            disabled={disabled}
        >
            {children}
        </motion.button>
    );
};

const Input: React.FC<{
    type?: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    name: string;
}> = ({ type = 'text', placeholder, value, onChange, name }) => (
    <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        name={name}
        className="w-full bg-[#05050A]/80 border border-white/10 rounded-full px-6 py-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all duration-300 placeholder-gray-600 backdrop-blur-xl"
    />
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} 
        className={`bg-white/[0.02] backdrop-blur-3xl border border-white/[0.05] p-6 md:p-8 rounded-[24px] shadow-2xl ${className}`}
    >
        {children}
    </motion.div>
);

const Spinner = () => {
    const { theme } = useTheme();
    return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className={`animate-spin h-6 w-6 ${theme.spinner}`} />
        </div>
    );
};

const Alert: React.FC<{ message: string; type?: 'error' | 'success' }> = ({ message, type = 'error' }) => {
    const colors = {
        error: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]',
        success: 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]',
    };
    const Icon = type === 'error' ? AlertTriangle : Check;
    return (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-2xl border flex items-center gap-3 backdrop-blur-md ${colors[type]}`}>
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">{message}</span>
        </motion.div>
    );
};

const Modal: React.FC<{ children: React.ReactNode; onClose: () => void; title: string }> = ({ children, onClose, title }) => {
    const { theme } = useTheme();
    return (
        <SafeAnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.95, y: 20, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="bg-[#05050A] border border-white/10 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${theme.textGrad}`}></div>
                    <header className="p-6 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.01]">
                        <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
                        <Button onClick={onClose} variant="ghost" className="!p-2 !rounded-full bg-white/[0.05] hover:bg-white/[0.1]">X</Button>
                    </header>
                    <div className="p-6 flex-grow overflow-y-auto">
                        {children}
                    </div>
                </motion.div>
            </motion.div>
        </SafeAnimatePresence>
    );
};

const ThemeModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { theme: activeTheme, setActiveThemeId, themes } = useTheme();
    return (
        <Modal title="System Appearance" onClose={onClose}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {themes.map((t: any) => (
                    <button 
                        key={t.id} 
                        onClick={() => { setActiveThemeId(t.id); onClose(); }} 
                        className={`p-6 rounded-2xl border text-left transition-all ${activeTheme.id === t.id ? `bg-white/10 ${t.borderPrimary} shadow-lg shadow-white/5` : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'}`}
                    >
                        <div className="flex gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full shadow-lg" style={{background: `linear-gradient(135deg, ${t.logoGrad[0]}, ${t.logoGrad[1]})`}}></div>
                        </div>
                        <h4 className="text-xl font-bold text-white mb-1">{t.name}</h4>
                        <p className="text-sm text-gray-400">{t.desc}</p>
                    </button>
                ))}
            </div>
        </Modal>
    );
};

// --- Layout Components (Floating Dock Navbar) ---
const Navbar: React.FC<{ setPage: (page: string) => void }> = ({ setPage }) => {
    const { user } = useAuth();
    const [showThemeModal, setShowThemeModal] = useState(false);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            setPage('login');
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };

    return (
        <>
            <header className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
                <nav className="pointer-events-auto bg-[#05050A]/60 backdrop-blur-2xl border border-white/10 rounded-full flex items-center justify-between p-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)] w-max min-w-[300px]">
                    <div className="flex items-center cursor-pointer pl-2 pr-4" onClick={() => setPage(user && !user.isAnonymous ? 'dashboard' : 'home')}>
                        <VeritasLogo />
                        <h1 className="ml-3 text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight hidden md:block">Veritas</h1>
                    </div>
                    <div className="flex items-center gap-1">
                        {user && !user.isAnonymous ? (
                             <>
                                <Button onClick={() => setPage('dashboard')} variant="glass" className="!px-4 !py-2 !rounded-full"><BarChart3 size={18} /></Button>
                                <Button onClick={() => setPage('gym')} variant="glass" className="!px-4 !py-2 !rounded-full"><ShieldQuestion size={18} /></Button>
                                <Button onClick={() => setPage('arena')} variant="glass" className="!px-4 !py-2 !rounded-full"><Swords size={18} /></Button>
                                <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
                                <Button onClick={() => setShowThemeModal(true)} variant="glass" className="!px-4 !py-2 !rounded-full"><Palette size={18} /></Button>
                                <Button onClick={handleSignOut} variant="danger" className="!px-4 !py-2 !rounded-full"><LogOut size={18} /></Button>
                            </>
                        ) : (
                            <>
                                <Button onClick={() => setShowThemeModal(true)} variant="glass" className="!px-4 !py-2 !rounded-full mr-2"><Palette size={18} /></Button>
                                <Button onClick={() => setPage('login')} variant="ghost" className="!py-2">Login</Button>
                                <Button onClick={() => setPage('signup')} variant="primary" className="!py-2">Sign Up</Button>
                            </>
                        )}
                    </div>
                </nav>
            </header>
            {/* Modal moved outside the header so it regains pointer events! */}
            {showThemeModal && <ThemeModal onClose={() => setShowThemeModal(false)} />}
        </>
    );
};

const Footer = () => (
    <footer className="w-full mt-24 pb-8 z-10 relative">
        <div className="max-w-5xl mx-auto text-center text-gray-600 text-xs uppercase tracking-widest font-medium">
            <p>&copy; {new Date().getFullYear()} Veritas AI. A Groundbreaking Project.</p>
        </div>
    </footer>
);

// --- Page Components ---
const HomePage: React.FC<{ setPage: (page: string) => void }> = ({ setPage }) => {
    const { theme } = useTheme();
    return (
        <div className="text-center pt-24 md:pt-40 pb-20 relative z-10 flex flex-col items-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className={`inline-flex items-center ${theme.bgPrimaryGlow} ${theme.textPrimary} px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase border ${theme.borderPrimary} mb-8 backdrop-blur-md transition-colors duration-1000`}
            >
                <Sparkles className="inline-block mr-2 h-4 w-4" />
                Next-Gen Cognitive Training
            </motion.div>
            
            <motion.h1 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-gray-500 leading-tight tracking-tighter max-w-4xl"
            >
                The Gymnasium for Your Mind.
            </motion.h1>
            
            <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="mt-8 max-w-2xl mx-auto text-lg md:text-xl text-gray-400 font-medium leading-relaxed"
            >
                In an era of AI-generated content and sophisticated disinformation, Veritas is your personal AI trainer to build bulletproof arguments and master the art of reason.
            </motion.p>
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 100, delay: 0.5 }}
                className="mt-12"
            >
                <Button onClick={() => setPage('signup')} variant="primary" className="px-10 py-5 text-lg rounded-full shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                    Start Your Free Training <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            </motion.div>
        </div>
    );
};

const AuthForm: React.FC<{ isLogin: boolean; setPage: (page: string) => void }> = ({ isLogin, setPage }) => {
    const { theme } = useTheme();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email || !formData.password) {
            setError('Please fill in all fields.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, formData.email, formData.password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                await setDoc(doc(db, "users", userCredential.user.uid), {
                    email: userCredential.user.email,
                    joinedAt: new Date().toISOString(),
                });
            }
            setPage('dashboard');
        } catch (err: any) {
            setError(err.message.replace('Firebase: ', ''));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto pt-20 relative z-10">
            <Card className="!p-10 !bg-[#05050A]/80">
                <div className="text-center">
                    <div className="flex justify-center mb-6"><VeritasLogo /></div>
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                    <p className="text-gray-400 text-sm">{isLogin ? 'Log in to continue your training.' : 'Start your journey to sharper thinking.'}</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5 mt-8">
                    {error && <Alert message={error} />}
                    <Input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} />
                    <Input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} />
                    <Button type="submit" variant="primary" className="w-full !py-4" disabled={loading}>
                        {loading ? <Spinner /> : (isLogin ? 'Login' : 'Sign Up')}
                    </Button>
                </form>
                <p className="text-center mt-8 text-sm text-gray-500 font-medium">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <span
                        className={`${theme.textPrimary} hover:text-white font-bold cursor-pointer transition-colors duration-500`}
                        onClick={() => setPage(isLogin ? 'signup' : 'login')}
                    >
                        {isLogin ? 'Sign Up' : 'Login'}
                    </span>
                </p>
            </Card>
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    const { theme } = useTheme();
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#05050A]/90 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl">
          <p className="text-white font-bold mb-1 tracking-tight">{`${label || payload[0].name}`}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full shadow-lg" style={{backgroundColor: theme.logoGrad[0]}}></div>
            <p className="font-medium" style={{color: theme.logoGrad[0]}}>{`Count : ${payload[0].value}`}</p>
          </div>
        </div>
      );
    }
    return null;
};

// --- Custom Argument Map ---
const ArgumentMap: React.FC<{ nodes: any[]; edges: any[] }> = ({ nodes, edges }) => {
    const { theme } = useTheme();
    const [viewbox, setViewbox] = useState({ x: -400, y: -50, w: 800, h: 600 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setLastPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const dx = (e.clientX - lastPos.x) * (viewbox.w / 800);
        const dy = (e.clientY - lastPos.y) * (viewbox.h / 600);
        setViewbox(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
        setLastPos({ x: e.clientX, y: e.clientY });
    };

    return (
        <div 
            className="w-full h-full bg-[#030014] cursor-grab active:cursor-grabbing overflow-hidden rounded-xl border border-white/5 relative transition-colors duration-1000"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
        >
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            
            <svg viewBox={`${viewbox.x} ${viewbox.y} ${viewbox.w} ${viewbox.h}`} className="w-full h-full relative z-10">
                {edges.map((edge, idx) => {
                    const s = nodes.find(n => n.id === edge.source);
                    const t = nodes.find(n => n.id === edge.target);
                    if (!s || !t) return null;
                    return <line key={idx} x1={s.position.x} y1={s.position.y} x2={t.position.x} y2={t.position.y} stroke={theme.logoGrad[0]} strokeOpacity="0.4" strokeWidth="2" />;
                })}
                {nodes.map((n, idx) => (
                    <g key={idx} transform={`translate(${n.position.x - 75}, ${n.position.y - 30})`}>
                        <rect width="150" height="60" rx="12" className={n.id === '1' ? 'fill-white/[0.1] border border-white' : 'fill-white/[0.05] stroke-white/20'} stroke={n.id === '1' ? theme.logoGrad[0] : 'rgba(255,255,255,0.2)'} strokeWidth="1.5" style={{ backdropFilter: 'blur(10px)'}} />
                        <foreignObject width="140" height="50" x="5" y="5">
                            <div className="w-full h-full flex items-center justify-center text-center p-2">
                                <p className="text-[10px] font-bold text-white uppercase leading-tight line-clamp-3 tracking-wider">{n.data?.label || ""}</p>
                            </div>
                        </foreignObject>
                    </g>
                ))}
            </svg>
        </div>
    );
};

// --- DASHBOARD COMPONENT ---

const DashboardPage: React.FC<{ setPage: (page: string) => void }> = ({ setPage }) => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [report, setReport] = useState<any>(null);
    const [chartData, setChartData] = useState<any>(SAMPLE_CHART_DATA);
    
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [isGeneratingCharts, setIsGeneratingCharts] = useState(false);
    const [isGeneratingDictionary, setIsGeneratingDictionary] = useState(false);
    const [dictionaryData, setDictionaryData] = useState<any>(null);
    const [showDictionary, setShowDictionary] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const GradientDefs = () => (
        <svg width="0" height="0">
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.barGradient[0]} stopOpacity={0.9}/>
              <stop offset="50%" stopColor={theme.barGradient[1]} stopOpacity={0.7}/>
              <stop offset="100%" stopColor={theme.barGradient[1]} stopOpacity={0.1}/>
            </linearGradient>
          </defs>
        </svg>
    );

    const fetchAndAnalyzeData = async (mode: 'report' | 'charts') => {
        if (!user) return;
        
        if (mode === 'report') setIsGeneratingReport(true);
        if (mode === 'charts') setIsGeneratingCharts(true);
        setError(null);

        try {
            const sessionsRef = collection(db, 'users', user.uid, 'gym_sessions');
            const q = query(sessionsRef, orderBy('timestamp', 'desc'), limit(5));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                setError("No debate history found. Complete some sessions in the Gym first!");
                setIsGeneratingReport(false);
                setIsGeneratingCharts(false);
                return;
            }

            const transcripts = querySnapshot.docs.map(doc => doc.data().transcript);
            
            if (mode === 'report') {
                const prompt = `Act as a cognitive psychologist. Analyze ONLY the 'user' messages in these debate transcripts. Identify their subconscious cognitive biases. Return a valid JSON array of objects with keys: "biasName", "explanation", and "exampleQuote".\n\nTranscripts:\n${transcripts.join("\n---\n")}`;
                const responseText = await callGeminiAPI(prompt, setError);
                setReport(JSON.parse(responseText.replace(/```json|```/g, '').trim()));
            } else if (mode === 'charts') {
                const prompt = `Analyze ONLY the 'user' messages in these debate transcripts and provide a quantitative summary of logical fallacies and cognitive biases. Return a single valid JSON object with two keys: "fallacyData" and "biasData".
                - "fallacyData" should be an array of objects, each with "name" (string) and "count" (number).
                - "biasData" should be an array of objects, each with "name" (string) and "value" (number).
                \n\nTranscripts:\n${transcripts.join("\n---\n")}`;
                const responseText = await callGeminiAPI(prompt, setError);
                const newData = JSON.parse(responseText.replace(/```json|```/g, '').trim());
                setChartData({ ...newData, isSample: false }); 
            }
        } catch (e: any) {
            setError("Failed to analyze data. The AI response may have been invalid.");
            console.error(e);
        } finally {
            setIsGeneratingReport(false);
            setIsGeneratingCharts(false);
        }
    };

    const fetchDictionary = async () => {
        if (!chartData) return;
        setShowDictionary(true); 
        setError(null);

        try {
            const terms = [
                ...(chartData.fallacyData?.map((f: any) => f.name) || []),
                ...(chartData.biasData?.map((b: any) => b.name) || [])
            ];

            const finalDictionary: any[] = [];
            const unknownTerms: string[] = [];

            terms.forEach(term => {
                const localDef = COMMON_DICTIONARY[term.trim()];
                if (localDef) {
                    finalDictionary.push({ term, type: localDef.type, definition: localDef.definition, example: localDef.example });
                } else {
                    unknownTerms.push(term);
                }
            });

            if (unknownTerms.length > 0) {
                setIsGeneratingDictionary(true); 
                const prompt = `Act as an expert in logic and psychology. Provide a concise definition and a single quote example for each of the following logical fallacies and cognitive biases: ${unknownTerms.join(', ')}. Return a valid JSON array of objects with keys: "term", "type" (either "Logical Fallacy" or "Cognitive Bias"), "definition", and "example".`;
                
                const responseText = await callGeminiAPI(prompt, setError);
                const newData = JSON.parse(responseText.replace(/```json|```/g, '').trim());
                finalDictionary.push(...newData);
            }

            setDictionaryData(finalDictionary);
        } catch (e: any) {
            setError("Failed to generate definitions.");
        } finally {
            setIsGeneratingDictionary(false);
        }
    };

    if (!user) return <Spinner />;

    return (
        <div className="space-y-8 pb-12 relative z-10 pt-4">
            <GradientDefs />
            
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
                    Welcome, <span className={`text-transparent bg-clip-text bg-gradient-to-r ${theme.textGrad} transition-colors duration-1000`}>{user.isAnonymous ? "Guest" : user.email}</span>
                </h1>
                <p className="text-gray-400 text-lg font-medium">Your cognitive training telemetry is ready.</p>
            </motion.div>
            
            {error && <Alert message={error} />}

            {/* --- TOP SECTION: COGNITIVE REPORT --- */}
            <Card className="p-0 overflow-hidden flex flex-col group transition-colors duration-500 hover:bg-white/[0.03]">
                <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-white/[0.05] relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none transition-colors duration-1000`}></div>
                    
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold text-white tracking-tight">Generate Your Cognitive Report</h2>
                        <p className="text-gray-400 mt-1 text-sm font-medium">Analyze your debate history to uncover your subconscious blindspots.</p>
                    </div>
                    <Button onClick={() => fetchAndAnalyzeData('report')} disabled={isGeneratingReport} variant="secondary" className="whitespace-nowrap relative z-10">
                        {isGeneratingReport ? <Spinner /> : <><FileText size={18}/> {report ? "Regenerate" : "Generate Report"}</>}
                    </Button>
                </div>
                
                {report && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-6 md:p-8 space-y-6 bg-black/20">
                        {report.map((item: any, index: number) => (
                            <div key={index} className={`p-6 bg-[#05050A]/50 border border-white/[0.05] rounded-2xl relative overflow-hidden group-hover:${theme.borderPrimary} transition-colors duration-500`}>
                                <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${theme.textGrad} transition-all duration-1000`}></div>
                                <h4 className={`text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${theme.textGrad} mb-3 transition-all duration-1000`}>{item.biasName}</h4>
                                <p className="text-gray-300 text-sm leading-relaxed">{item.explanation}</p>
                                <div className="mt-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                                    <p className="text-gray-400 text-sm italic font-medium">"{item.exampleQuote}"</p>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </Card>

            {/* --- MIDDLE BANNER: ANALYTICS CONTROLS --- */}
            <Card className="p-0 overflow-hidden relative group transition-colors duration-500 hover:bg-white/[0.03]">
                 <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/4 pointer-events-none transition-colors duration-1000"></div>
                <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Performance Analytics</h2>
                        <p className="text-gray-400 mt-1 text-sm font-medium">Quantify your logical fallacies and bias tendencies over time.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button onClick={fetchDictionary} variant="glass" className="whitespace-nowrap">
                            <BookOpen size={18} /> Explain Terms
                        </Button>
                        <Button onClick={() => fetchAndAnalyzeData('charts')} disabled={isGeneratingCharts} variant="secondary" className="whitespace-nowrap">
                            {isGeneratingCharts ? <Spinner/> : <><BarChart3 size={18}/> {chartData.isSample ? "Analyze Performance" : "Update Analytics"}</>}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* --- BOTTOM SECTION: 2-CARD GRID FOR CHARTS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left Card: Bar Chart */}
                <Card className={`flex flex-col relative overflow-hidden group hover:${theme.borderPrimary} transition-colors duration-500`}>
                    <div className={`absolute bottom-0 right-0 w-full h-1/2 ${theme.bgPrimaryGlow} blur-3xl pointer-events-none transition-colors duration-1000`}></div>
                    <h3 className="text-xl font-bold text-white mb-8 tracking-tight relative z-10 flex items-center">
                        Logical Fallacy Analysis 
                        {chartData.isSample && <span className={`ml-3 text-xs font-bold uppercase tracking-widest ${theme.textPrimary} ${theme.bgPrimaryGlow} px-2 py-1 rounded-md border ${theme.borderPrimary} transition-colors duration-1000`}>Sample</span>}
                    </h3>
                    <div className="flex-grow min-h-[350px] relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.fallacyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} dy={15} fontWeight={500} />
                                <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} dx={-10} fontWeight={500} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}/>
                                <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Right Card: Pie Chart */}
                <Card className={`flex flex-col relative overflow-hidden group hover:${theme.borderSecondary} transition-colors duration-500`}>
                    <div className={`absolute bottom-0 left-0 w-full h-1/2 ${theme.bgSecondaryGlow} blur-3xl pointer-events-none transition-colors duration-1000`}></div>
                    <h3 className="text-xl font-bold text-white mb-2 tracking-tight relative z-10 flex items-center">
                        Cognitive Bias Distribution
                        {chartData.isSample && <span className={`ml-3 text-xs font-bold uppercase tracking-widest ${theme.textSecondary} ${theme.bgSecondaryGlow} px-2 py-1 rounded-md border ${theme.borderSecondary} transition-colors duration-1000`}>Sample</span>}
                    </h3>
                    <div className="flex-grow min-h-[350px] relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                                <Pie 
                                    data={chartData.biasData} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="45%" 
                                    innerRadius={80} 
                                    outerRadius={110} 
                                    paddingAngle={4}
                                    stroke="none"
                                >
                                    {chartData.biasData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={theme.pieColors[index % theme.pieColors.length]} style={{filter: `drop-shadow(0px 0px 8px ${theme.pieColors[index % theme.pieColors.length]}80)`}} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px', fontSize: '12px', fontWeight: 500, color: '#9CA3AF' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

            </div>

            {/* --- DYNAMIC DICTIONARY MODAL --- */}
            {showDictionary && (
                <Modal title="Veritas Dictionary" onClose={() => setShowDictionary(false)}>
                    {isGeneratingDictionary ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-6">
                            <Spinner />
                            <p className={`${theme.textPrimary} font-medium tracking-wide animate-pulse`}>Synchronizing Neural Dictionary...</p>
                        </div>
                    ) : dictionaryData ? (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-400 mb-6 font-medium">Definitions for anomalies currently detected in your telemetry profile.</p>
                            {dictionaryData.map((item: any, idx: number) => (
                                <div key={idx} className="p-5 bg-white/[0.02] rounded-2xl border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="text-lg font-bold text-white tracking-tight">{item.term}</h4>
                                        <span className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors duration-1000 ${item.type.includes('Bias') ? `${theme.bgSecondaryGlow} ${theme.textSecondary} ${theme.borderSecondary}` : `${theme.bgPrimaryGlow} ${theme.textPrimary} ${theme.borderPrimary}`}`}>
                                            {item.type}
                                        </span>
                                    </div>
                                    <p className="text-gray-300 text-sm leading-relaxed mb-4">{item.definition}</p>
                                    
                                    {item.example && (
                                        <div className="p-4 bg-[#05050A]/50 rounded-xl border-l-2 border-white/20">
                                            <p className="text-gray-400 text-sm italic font-medium">"{item.example}"</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-red-400 text-center font-medium">Failed to load dictionary. Please try again.</p>
                    )}
                </Modal>
            )}
        </div>
    );
};

const ArenaPage: React.FC = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [arenaState, setArenaState] = useState<'idle' | 'matching' | 'debating' | 'finished'>('idle');
    const [debateId, setDebateId] = useState<string | null>(null);
    const [debateData, setDebateData] = useState<any>(null);
    const [arenaMessage, setArenaMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
    const [isLoadingTopic, setIsLoadingTopic] = useState(true);

    useEffect(() => {
        const getActiveTopic = async () => {
            setIsLoadingTopic(true);
            const topicsRef = collection(db, 'topics');
            const q = query(topicsRef, where('isActive', '==', true), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const topicDoc = querySnapshot.docs[0];
                setCurrentTopic({ id: topicDoc.id, ...topicDoc.data() } as Topic);
            } else {
                setCurrentTopic({ id: 'ai_regulation', title: 'Should AI be regulated?', isActive: true });
            }
            setIsLoadingTopic(false);
        };
        getActiveTopic();
    }, []);

    const findMatch = async () => {
        if (!user || !currentTopic) return;
        setArenaState('matching');
        const matchmakingRef = collection(db, 'matchmaking');
        const q = query(matchmakingRef, where('topic', '==', currentTopic.id), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const opponentDoc = querySnapshot.docs[0];
            if (opponentDoc.id !== user.uid) {
                const opponentId = opponentDoc.id;
                await deleteDoc(doc(db, 'matchmaking', opponentId));
                
                const players = { [user.uid]: 'for', [opponentId]: 'against' };
                const newDebateRef = await addDoc(collection(db, 'debates'), {
                    topic: currentTopic.title,
                    topicId: currentTopic.id,
                    players,
                    turn: user.uid,
                    status: 'active',
                    createdAt: serverTimestamp(),
                    messages: []
                });
                setDebateId(newDebateRef.id);
                setArenaState('debating');
            }
        } else {
            await setDoc(doc(db, 'matchmaking', user.uid), {
                topic: currentTopic.id,
                timestamp: serverTimestamp()
            });
        }
    };

    useEffect(() => {
        if (arenaState === 'matching' && user && currentTopic) {
            const q = query(collection(db, 'debates'), where(`players.${user.uid}`, 'in', ['for', 'against']), where('topicId', '==', currentTopic.id), where('status', '==', 'active'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                if (!snapshot.empty) {
                    const debateDoc = snapshot.docs[0];
                    setDebateId(debateDoc.id);
                    setArenaState('debating');
                }
            });
            return () => unsubscribe();
        }
    }, [arenaState, user, currentTopic]);

    useEffect(() => {
        if (debateId) {
            const unsubscribe = onSnapshot(doc(db, 'debates', debateId), (doc) => {
                if(doc.exists()) {
                    const data = doc.data();
                    if (data.status === 'finished') {
                        setDebateId(null);
                        setDebateData(null);
                        setArenaState('idle');
                    } else {
                        setDebateData(data);
                    }
                } else {
                    setDebateId(null);
                    setDebateData(null);
                    setArenaState('idle');
                }
            });
            return () => unsubscribe();
        }
    }, [debateId]);
    
    const handleArenaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!arenaMessage.trim() || !user || !debateId || debateData.turn !== user.uid) return;
        
        setIsSubmitting(true);
        const newMessages = [...debateData.messages, { sender: user.uid, text: arenaMessage, timestamp: new Date().toISOString() }];
        
        const moderationPrompt = `You are a debate moderator. Analyze this statement for logical fallacies: "${arenaMessage}". If a fallacy is found, respond with "MODERATOR NOTE: [Fallacy Name] - [Brief Explanation]". Otherwise, respond with "OK".`;
        const moderationResult = await callGeminiAPI(moderationPrompt, () => {});

        if (moderationResult !== "OK") {
            newMessages.push({ sender: 'moderator', text: moderationResult, timestamp: new Date().toISOString() });
        }

        const opponentId = Object.keys(debateData.players).find(id => id !== user.uid);
        
        await updateDoc(doc(db, 'debates', debateId), {
            messages: newMessages,
            turn: opponentId
        });

        setArenaMessage('');
        setIsSubmitting(false);
    };

    const leaveDebate = async () => {
        if (debateId) {
            await updateDoc(doc(db, 'debates', debateId), {
                status: 'finished'
            });
        }
        setDebateId(null);
        setDebateData(null);
        setArenaState('idle');
    };

    useEffect(() => {
        return () => {
            if (arenaState === 'matching' && user) {
                deleteDoc(doc(db, 'matchmaking', user.uid));
            }
        }
    }, [arenaState, user]);

    if (arenaState === 'debating' && debateData) {
        const myRole = debateData.players[user!.uid];
        const isMyTurn = debateData.turn === user!.uid;
        
        return (
            <div className="relative z-10 pt-10">
                <Card className="!bg-[#05050A]/90">
                    <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                        <h2 className="text-2xl text-center text-white font-bold tracking-tight">{debateData.topic}</h2>
                        <Button onClick={leaveDebate} variant="danger" className="!px-4 !py-2">Leave Debate</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-6 text-center mb-6">
                        <div className={`p-4 rounded-2xl border transition-colors duration-1000 ${myRole === 'for' ? `${theme.borderPrimary} ${theme.bgPrimaryGlow} shadow-lg shadow-white/5` : 'border-white/[0.05] bg-white/[0.02]'}`}>
                            <h3 className={`text-2xl font-black tracking-widest ${theme.textPrimary}`}>FOR</h3>
                            <p className="text-sm font-medium mt-1 text-gray-400">{myRole === 'for' ? 'You' : 'Opponent'}</p>
                        </div>
                        <div className={`p-4 rounded-2xl border transition-colors duration-1000 ${myRole === 'against' ? `${theme.borderSecondary} ${theme.bgSecondaryGlow} shadow-lg shadow-white/5` : 'border-white/[0.05] bg-white/[0.02]'}`}>
                            <h3 className={`text-2xl font-black tracking-widest ${theme.textSecondary}`}>AGAINST</h3>
                            <p className="text-sm font-medium mt-1 text-gray-400">{myRole === 'against' ? 'You' : 'Opponent'}</p>
                        </div>
                    </div>

                    <div className="h-[40vh] bg-black/40 rounded-2xl p-6 overflow-y-auto space-y-6 border border-white/5">
                        {debateData.messages.map((msg: any, index: number) => {
                            const isUser = msg.sender === user!.uid;
                            if (msg.sender === 'moderator') {
                                return <div key={index} className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-center text-yellow-400 text-sm italic font-medium mx-10 shadow-[0_0_10px_rgba(234,179,8,0.1)]">{msg.text}</div>
                            }
                            return (
                                <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-4 rounded-2xl max-w-md backdrop-blur-md shadow-lg transition-colors duration-1000 ${isUser ? `bg-gradient-to-br ${theme.buttonSecondary} text-white rounded-tr-sm border border-white/20` : 'bg-white/[0.05] border border-white/10 text-gray-200 rounded-tl-sm'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    
                    <form onSubmit={handleArenaSubmit} className="mt-6 flex gap-3">
                        <Input name="arenaMessage" placeholder={isMyTurn ? "Construct your argument..." : "Waiting for opponent's transmission..."} value={arenaMessage} onChange={(e) => setArenaMessage(e.target.value)} />
                        <Button type="submit" variant="secondary" disabled={!isMyTurn || isSubmitting} className="!px-6">
                            {isSubmitting ? <Spinner /> : <Send size={20} />}
                        </Button>
                    </form>
                </Card>
            </div>
        )
    }

    return (
        <div className="text-center pt-20 relative z-10">
            <motion.div className="inline-block p-4 rounded-3xl bg-white/[0.02] border border-white/10 mb-8 shadow-2xl backdrop-blur-md">
                <Swords className={`h-12 w-12 ${theme.textPrimary} transition-colors duration-1000`} />
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className={`text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r ${theme.textGrad} tracking-tighter transition-colors duration-1000`}>
                The Debate Arena
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6 text-gray-400 text-lg max-w-xl mx-auto font-medium">
                Challenge other minds in a live, AI-moderated neural link. Reason is your only weapon.
            </motion.p>
            
            <Card className="mt-16 max-w-2xl mx-auto text-center !p-12 !bg-[#05050A]/80 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 blur-[100px] pointer-events-none transition-colors duration-1000"></div>
                {isLoadingTopic ? <Spinner /> : (
                    <div className="relative z-10">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Current Synchronization Topic</h2>
                        <p className="text-4xl md:text-5xl mt-2 font-serif italic text-white">"{currentTopic?.title}"</p>
                        <div className="mt-12 flex justify-center">
                            <Button onClick={findMatch} variant="secondary" disabled={arenaState === 'matching'} className="!px-10 !py-5 text-lg shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                {arenaState === 'matching' ? (<><Spinner /> Establishing Link...</>) : (<><Swords /> Enter Matchmaking</>)}
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

const GymPage = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [thesis, setThesis] = useState('');
    const [debate, setDebate] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentMessage, setCurrentMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [isListening, setIsListening] = useState(false);
    const speechRecognition = useRef<SpeechRecognition | null>(null);
    const [isMapVisible, setIsMapVisible] = useState(false);
    
    const [nodes, setNodes] = useState<any[]>([]);
    const [edges, setEdges] = useState<any[]>([]);

    const saveDebateSession = async (finalDebate: Message[]) => {
        if (!user || finalDebate.length < 2) return;
        const transcript = finalDebate.map(m => `${m.sender}: ${m.text}`).join('\n');
        try {
            await addDoc(collection(db, 'users', user.uid, 'gym_sessions'), {
                transcript,
                timestamp: serverTimestamp(),
                thesis: finalDebate[0].text
            });
        } catch (e) {
            console.error("Error saving debate session: ", e);
        }
    };

    const generateArgumentMap = async () => {
        const conversation = debate.map(m => `${m.sender}: ${m.text}`).join('\n');
        const prompt = `Analyze this Socratic dialogue and structure it into a JSON format for a logical tree visualization. The JSON should contain two keys: "nodes" and "edges".
        - Each node object must have "id", "data": { "label": "..." }, and "position": { "x": ..., "y": ... }. Space the positions out so they don't overlap (e.g., x:0 y:0, then x:0 y:100).
        - The root node (id: '1') should be the initial thesis.
        - Each edge object must have "id", "source", and "target".
        - Return ONLY raw JSON. Dialogue:\n${conversation}`;

        try {
            const responseText = await callGeminiAPI(prompt, setError);
            const data = JSON.parse(responseText.replace(/```json|```/g, ''));
            setNodes(data.nodes);
            setEdges(data.edges);
            setIsMapVisible(true);
        } catch (e) {
            setError("Failed to generate argument map.");
            console.error(e);
        }
    };

    useEffect(() => {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
            const recognition = new SpeechRecognitionAPI();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                if (debate.length === 0) setThesis(transcript);
                else setCurrentMessage(transcript);
            };
            recognition.onerror = (event: any) => setError(`Speech recognition error: ${event.error}`);
            recognition.onend = () => setIsListening(false);
            speechRecognition.current = recognition;
        } else {
            setError("Sorry, your browser doesn't support speech recognition.");
        }
    }, [debate.length]);

    const toggleListening = () => {
        if (!speechRecognition.current) return;
        if (isListening) {
            speechRecognition.current.stop();
        } else {
            speechRecognition.current.start();
        }
        setIsListening(!isListening);
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [debate]);
    
    const handleDebateSubmit = async (text: string, isInitial: boolean) => {
        if (!text.trim()) return;
        
        setIsLoading(true);
        setError('');
        if (isListening && speechRecognition.current) {
            speechRecognition.current.stop();
        }
        
        const newUserMessage: Message = { sender: 'user', text };
        const newDebate: Message[] = [...debate, newUserMessage];
        setDebate(newDebate);
        if(isInitial) setThesis(''); else setCurrentMessage('');

        const lastMessage = newDebate[newDebate.length - 2]?.text || "the beginning of the debate.";
        const prompt = isInitial 
            ? `You are "Veritas," an AI Socratic mentor. The user's thesis is: "${text}". What is your first probing question?`
            : `Continuing the Socratic dialogue. The user's previous statement was: "${lastMessage}". Their new response is: "${text}". Ask your next probing, Socratic question.`;

        const aiResponse = await callGeminiAPI(prompt, setError);
        const finalDebate: Message[] = [...newDebate, { sender: 'ai', text: aiResponse }];
        setDebate(finalDebate);
        setIsLoading(false);

        if (finalDebate.length >= 2) {
            await saveDebateSession(finalDebate);
        }
    };

    return (
        <div className="relative z-10 pt-10">
            <Card className="h-[80vh] flex flex-col p-4 md:p-6 !bg-[#05050A]/90">
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-2 ${theme.bgPrimaryGlow} rounded-xl border ${theme.borderPrimary} transition-colors duration-1000`}><ShieldQuestion className={theme.textPrimary} /></div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">The Critical Thinking Gym</h1>
                    </div>
                    {debate.length > 3 && (
                        <Button onClick={generateArgumentMap} variant="glass" className="!px-4 !py-2">
                            <Map size={16} /> Generate Map
                        </Button>
                    )}
                </div>
                <div className="flex-grow bg-black/40 rounded-2xl p-6 overflow-y-auto space-y-6 border border-white/5 scrollbar-thin scrollbar-thumb-white/10">
                    {debate.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                            <VeritasLogo />
                            <p className="text-xl text-white font-medium mt-6">State your opening thesis to begin.</p>
                            <p className="text-sm text-gray-400 mt-2">The AI Mentor will challenge your logic using the Socratic method.</p>
                        </div>
                    )}
                    {debate.map((msg, index) => (
                        <motion.div key={index} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex items-start gap-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.sender === 'ai' && <div className="mt-1"><VeritasLogo /></div>}
                            <div className={`max-w-[75%] p-5 rounded-2xl backdrop-blur-md shadow-xl text-[15px] leading-relaxed transition-colors duration-1000 ${msg.sender === 'user' ? `bg-gradient-to-br ${theme.buttonSecondary} text-white rounded-tr-sm border border-white/20` : 'bg-white/[0.03] border border-white/10 text-gray-200 rounded-tl-sm'}`}>
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                            </div>
                        </motion.div>
                    ))}
                    {isLoading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4">
                            <div className="mt-1"><VeritasLogo /></div>
                            <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl rounded-tl-sm flex gap-2">
                                <div className="w-2 h-2 rounded-full animate-bounce" style={{backgroundColor: theme.logoGrad[0]}}></div>
                                <div className="w-2 h-2 rounded-full animate-bounce" style={{backgroundColor: theme.logoGrad[0], animationDelay: '0.2s'}}></div>
                                <div className="w-2 h-2 rounded-full animate-bounce" style={{backgroundColor: theme.logoGrad[0], animationDelay: '0.4s'}}></div>
                            </div>
                        </motion.div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                <div className="mt-6">
                    {error && <div className="mb-4"><Alert message={error} /></div>}
                    <form onSubmit={(e) => { e.preventDefault(); handleDebateSubmit(debate.length === 0 ? thesis : currentMessage, debate.length === 0); }} className="flex gap-3 items-center">
                        <div className="relative w-full">
                            <Input 
                                name="message"
                                placeholder={isListening ? "Listening to neural input..." : "Construct your response..."}
                                value={debate.length === 0 ? thesis : currentMessage}
                                onChange={(e) => debate.length === 0 ? setThesis(e.target.value) : setCurrentMessage(e.target.value)} 
                            />
                            <Button type="button" variant="ghost" onClick={toggleListening} className={`!absolute !right-2 !top-1/2 !-translate-y-1/2 !p-3 !rounded-full transition-colors ${isListening ? '!text-red-500 bg-red-500/10' : 'text-gray-400 hover:text-white'}`}>
                                <Mic size={20} />
                            </Button>
                        </div>
                        <Button type="submit" variant="secondary" disabled={isLoading} className="!p-4 !rounded-full shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                            <Send size={20} className="ml-1" />
                        </Button>
                    </form>
                </div>
            </Card>
            {isMapVisible && (
                <Modal title="Logical Architecture Map" onClose={() => setIsMapVisible(false)}>
                    <ArgumentMap nodes={nodes} edges={edges} />
                </Modal>
            )}
        </div>
    );
};


// --- Main App Wrapping ---
const GlobalErrorDisplay = () => {
    const { error } = useAuth();
    if (!error) return null;
    return <div className="mb-8 relative z-50 pt-20"><Alert message={error} type="error" /></div>;
};

const MainApp = () => {
    const { theme } = useTheme();
    const [page, setPage] = useState('home'); 
    
    const PageRenderer: React.FC = () => {
        const { user, loading } = useAuth();

        useEffect(() => {
            if (!loading) {
                if (user && !user.isAnonymous) {
                    if (['home', 'login', 'signup'].includes(page)) setPage('dashboard');
                } else {
                    if (['dashboard', 'gym', 'arena'].includes(page)) setPage('login');
                }
            }
        }, [user, loading, page]);
        
        if (loading) {
            return <div className="flex justify-center items-center h-screen relative z-10"><Spinner /></div>;
        }

        switch (page) {
            case 'login': return <AuthForm isLogin={true} setPage={setPage} />;
            case 'signup': return <AuthForm isLogin={false} setPage={setPage} />;
            case 'dashboard': return user ? <DashboardPage setPage={setPage} /> : <AuthForm isLogin={true} setPage={setPage}/>;
            case 'gym': return user ? <GymPage /> : <AuthForm isLogin={true} setPage={setPage}/>;
            case 'arena': return user ? <ArenaPage /> : <AuthForm isLogin={true} setPage={setPage}/>;
            case 'home':
            default: return <HomePage setPage={setPage} />;
        }
    };

    return (
        <div className={`${theme.bgBase} min-h-screen text-white font-sans selection:bg-white/30 overflow-hidden relative transition-colors duration-1000`}>
            {/* --- NEXT-GEN AURORA BACKGROUND (DYNAMIC) --- */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full ${theme.orb1} blur-[150px] transition-colors duration-1000`} />
                <div className={`absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full ${theme.orb2} blur-[150px] transition-colors duration-1000`} />
                <div className={`absolute top-[30%] left-[60%] w-[40%] h-[40%] rounded-full ${theme.orb3} blur-[150px] transition-colors duration-1000`} />
                <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")'}}></div>
            </div>

            <AppController setPage={setPage} />
            <main className="max-w-5xl mx-auto px-6 pt-16 pb-12 relative z-10">
                <GlobalErrorDisplay />
                <SafeAnimatePresence mode="wait">
                    <motion.div
                        key={page}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <PageRenderer />
                    </motion.div>
                </SafeAnimatePresence>
            </main>
            <Footer />
        </div>
    );
};

export default function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <MainApp />
            </ThemeProvider>
        </AuthProvider>
    );
}

const AppController: React.FC<{ setPage: (page: string) => void }> = ({ setPage }) => {
    const { loading } = useAuth();
    if (loading) return null;
    return <Navbar setPage={setPage} />;
};

// --- Helper Functions ---
async function callGeminiAPI(prompt: string, setError: (msg: string) => void) {
    try {
        let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
        const payload = { contents: chatHistory };
        
        const apiKey = GEMINI_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData?.error?.message || response.statusText || 'Unknown issue';
            throw new Error(`API Error (${response.status}): ${errorMessage}`);
        }
        
        const result = await response.json();
        if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
            return result.candidates[0].content.parts[0].text;
        } else {
            throw new Error("Invalid response structure from AI.");
        }
    } catch (err: any) {
        console.error("Gemini API call failed:", err);
        setError(err.message);
        return "My apologies, I encountered an issue connecting to the AI network.";
    }
}
