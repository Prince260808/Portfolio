
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  Sparkles, BrainCircuit, FileText, Send, Plus, Menu, X, Zap,
  MessageSquare, ArrowUpRight, LoaderCircle, AlertCircle, Copy,
  RotateCcw, CheckCircle2, Mail, ExternalLink,
} from "lucide-react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const PROFILE_LINKS = [
  { label: "GitHub", href: "https://github.com/Prince260808" },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/in/prince-gupta-0b297538b",
  },
  { label: "Email", href: "mailto:princegupta.mern@gmail.com", mail: true },
];

const PROJECT_LINKS = [
  {
    label: "AI Automation Platform",
    href: "https://ai-automation-1-moc9.onrender.com",
  },
  {
    label: "ZEVOX Tech Store",
    href: "https://zevox-tech-store.vercel.app/",
  },
  {
    label: "AgentForge AI (GitHub)",
    href: "https://github.com/Prince260808/AgentForge-AI",
  },
];

const markdownComponents = {
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-violet-300 underline underline-offset-2 hover:text-violet-200"
    >
      {children}
    </a>
  ),
};

const suggestions = [
  {
    icon: BrainCircuit,
    title: "Technical skills",
    question: "What technical skills does Prince have?",
  },
  {
    icon: FileText,
    title: "Projects",
    question: "Explain Prince's projects briefly.",
  },
  {
    icon: Sparkles,
    title: "AI experience",
    question: "What Generative AI and agentic AI work has Prince done?",
  },
  {
    icon: Zap,
    title: "Experience",
    question: "Does Prince have professional work experience?",
  },
  {
    icon: MessageSquare,
    title: "Education",
    question: "What is Prince's educational background?",
  },
  {
    icon: Mail,
    title: "Contact",
    question: "How can I contact Prince?",
  },
];

const makeMessage = (role, content, type = "normal") => ({
  id: `${Date.now()}-${Math.random()}`,
  role,
  content,
  type,
});

function MessageBubble({ message, onCopy, onRetry }) {
  const isUser = message.role === "user";
  const isError = message.type === "error";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 sm:gap-4 ${
        isUser ? "flex-row-reverse" : ""
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          isUser
            ? "bg-white/[0.08] text-gray-200"
            : "border border-violet-400/20 bg-violet-500/10 text-violet-300"
        }`}
      >
        {isUser ? (
          <span className="text-xs font-bold">You</span>
        ) : (
          <Sparkles size={17} />
        )}
      </div>

      <div
        className={`min-w-0 max-w-[88%] sm:max-w-[82%] ${
          isUser ? "text-right" : ""
        }`}
      >
        <div className="mb-2 text-xs text-gray-500">
          <span className="font-semibold text-gray-300">
            {isUser ? "You" : "Portfolio AI"}
          </span>
        </div>

        <div
          className={`rounded-2xl px-4 py-3.5 text-left text-sm leading-7 sm:px-5 ${
            isUser
              ? "rounded-tr-sm border border-violet-400/20 bg-violet-500/[0.14] text-gray-100"
              : isError
                ? "rounded-tl-sm border border-red-400/20 bg-red-500/[0.06] text-red-100"
                : "rounded-tl-sm border border-white/[0.08] bg-[#12121c] text-gray-300"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">
              {message.content}
            </p>
          ) : (
            <div className="prose-rag break-words">
              <ReactMarkdown components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && (
          <div className="mt-2 flex items-center gap-3">
            {!isError && (
              <button
                onClick={() => onCopy(message.content)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-gray-500 transition hover:bg-white/[0.05] hover:text-gray-200"
                aria-label="Copy answer"
              >
                <Copy size={12} />
                Copy
              </button>
            )}

            {isError && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-violet-300 transition hover:bg-violet-400/10"
              >
                <RotateCcw size={12} />
                Try again
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function LoadingMessage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 sm:gap-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-300">
        <Sparkles size={17} />
      </div>

      <div className="rounded-2xl rounded-tl-sm border border-white/[0.08] bg-[#12121c] px-5 py-4">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <LoaderCircle
            size={15}
            className="animate-spin text-violet-300"
          />
          <span>Thinking...</span>
        </div>

        <div className="mt-3 flex gap-1.5">
          {[0, 1, 2].map((item) => (
            <motion.span
              key={item}
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: item * 0.16,
              }}
              className="h-1.5 w-1.5 rounded-full bg-violet-400"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState("checking");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const activeRequest = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let timer;
    const controller = new AbortController();

    async function checkServer() {
      try {
        const response = await fetch(`${API_URL}/health`, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Health check failed");

        const data = await response.json();
        if (cancelled) return;

        if (data.ready) {
          setApiStatus("online");
          return;
        }

        setApiStatus("checking");
      } catch {
        if (cancelled) return;
        setApiStatus("offline");
      }

      timer = setTimeout(checkServer, 4000);
    }

    checkServer();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  useEffect(() => {
    return () => activeRequest.current?.controller.abort();
  }, []);

  function startNewChat() {
    activeRequest.current?.controller.abort();
    activeRequest.current = null;

    setMessages([]);
    setQuestion("");
    setLoading(false);
    setNotice("");
    setLastQuestion("");
    setMobileMenu(false);
    inputRef.current?.focus();
  }

  async function askQuestion(rawQuestion) {
    const cleanQuestion = rawQuestion.trim();

    if (!cleanQuestion || loading) return;

    if (cleanQuestion.length > 500) {
      setNotice("Please keep your question under 500 characters.");
      return;
    }

    if (apiStatus !== "online") {
      setNotice("The assistant is starting up. Please try again shortly.");
      return;
    }

    const history = messages
      .filter((message) => message.type !== "error")
      .slice(-6)
      .map(({ role, content }) => ({ role, content }));

    const controller = new AbortController();
    const request = { controller };

    activeRequest.current = request;

    setMessages((previous) => [
      ...previous,
      makeMessage("user", cleanQuestion),
    ]);

    setQuestion("");
    setNotice("");
    setLoading(true);
    setLastQuestion(cleanQuestion);

    const timeout = setTimeout(() => controller.abort(), 90000);

    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: cleanQuestion, history }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to answer right now. Please try again."
        );
      }

      if (
        typeof data.answer !== "string" ||
        !data.answer.trim()
      ) {
        throw new Error("The assistant returned an empty answer.");
      }

      if (activeRequest.current !== request) return;

      setMessages((previous) => [
        ...previous,
        makeMessage("assistant", data.answer.trim()),
      ]);
    } catch (error) {
      if (activeRequest.current !== request) return;

      setMessages((previous) => [
        ...previous,
        makeMessage(
          "assistant",
          error.name === "AbortError"
            ? "The request timed out. Please try again."
            : error.message || "Something went wrong. Please try again.",
          "error"
        ),
      ]);
    } finally {
      clearTimeout(timeout);

      if (activeRequest.current === request) {
        activeRequest.current = null;
        setLoading(false);
      }
    }
  }

  async function copyAnswer(text) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Answer copied.");
    } catch {
      setNotice("Could not copy the answer.");
    }
  }

  const status = {
    checking: {
      label: "Starting up…",
      dot: "bg-amber-400",
    },
    online: {
      label: "Assistant online",
      dot: "bg-emerald-400",
    },
    offline: {
      label: "Assistant offline",
      dot: "bg-red-400",
    },
  }[apiStatus];

  return (
    <div className="relative flex min-h-[100dvh] overflow-hidden bg-[#09090f] text-white selection:bg-violet-500/30">
      {/* BACKGROUND */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -left-48 -top-48 h-[450px] w-[450px] rounded-full bg-violet-600/[0.10] blur-[130px]" />
        <div className="absolute -right-48 top-[20%] h-[400px] w-[400px] rounded-full bg-cyan-500/[0.06] blur-[130px]" />
        <div className="absolute bottom-[-200px] left-[35%] h-[350px] w-[350px] rounded-full bg-purple-600/[0.06] blur-[120px]" />
      </div>

      {/* MOBILE OVERLAY */}
      <AnimatePresence>
        {mobileMenu && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenu(false)}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
            aria-label="Close navigation"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(86vw,280px)] flex-col border-r border-white/[0.07] bg-[#0c0b13]/95 p-5 backdrop-blur-xl transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          mobileMenu ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={startNewChat}
            className="flex items-center gap-3 rounded-xl text-left"
            aria-label="Start a new chat"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-900/30">
              <BrainCircuit size={21} />
            </div>

            <div>
              <p className="text-sm font-bold tracking-tight">
                Portfolio<span className="text-violet-400">RAG</span>
              </p>
              <p className="mt-0.5 text-[10px] text-gray-500">
                Prince Gupta
              </p>
            </div>
          </button>

          <button
            onClick={() => setMobileMenu(false)}
            className="rounded-lg p-2 text-gray-400 hover:bg-white/5 md:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <button
          onClick={startNewChat}
          className="mt-9 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium transition hover:border-violet-400/30 hover:bg-violet-400/[0.07]"
        >
          <Plus size={17} className="text-violet-300" />
          New conversation
        </button>

        <div className="mt-9 [@media(max-height:860px)]:hidden">
          <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
            Quick questions
          </p>

          <div className="space-y-1">
            {suggestions.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.title}
                  onClick={() => {
                    setMobileMenu(false);
                    askQuestion(item.question);
                  }}
                  disabled={loading}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs text-gray-400 transition hover:bg-white/[0.045] hover:text-white disabled:opacity-40"
                >
                  <Icon
                    size={16}
                    className="shrink-0 text-gray-500 transition group-hover:text-violet-300"
                  />
                  <span>{item.title}</span>
                  <ArrowUpRight
                    size={13}
                    className="ml-auto opacity-0 transition group-hover:opacity-100"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* PROFILE AND PROJECT LINKS */}
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
          <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
            Profile
          </p>

          <div className="space-y-0.5">
            {PROFILE_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.mail ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-gray-400 transition hover:bg-white/[0.045] hover:text-white"
              >
                {link.mail ? <Mail size={14} /> : <ExternalLink size={14} />}
                <span>{link.label}</span>
              </a>
            ))}
          </div>

          <p className="mb-3 mt-6 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
            Projects
          </p>

          <div className="space-y-0.5">
            {PROJECT_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-gray-400 transition hover:bg-white/[0.045] hover:text-white"
              >
                <ExternalLink size={14} />
                <span>{link.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* SIDEBAR FOOTER */}
        <div className="mt-auto pt-6">
          <div className="flex items-center gap-2 px-1">
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            <span className="text-[10px] text-gray-500">
              {status.label}
            </span>
          </div>

          <p className="mt-3 px-1 text-[10px] text-gray-700">
            React · Express · RAG
          </p>
        </div>
      </aside>

      {/* MAIN */}
      <main className="relative flex min-h-[100dvh] min-w-0 flex-1 flex-col">
        {/* HEADER */}
        <header className="sticky top-0 z-20 flex min-h-[68px] shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#09090f]/80 px-4 py-3 backdrop-blur-xl sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileMenu(true)}
              className="rounded-lg border border-white/[0.08] p-2 text-gray-300 md:hidden"
              aria-label="Open navigation"
            >
              <Menu size={19} />
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold">
                Prince Gupta · Portfolio Assistant
              </h1>
              <p className="mt-1 truncate text-[10px] text-gray-500">
                Answers come from his resume and knowledge base
              </p>
            </div>
          </div>

          <div className="ml-3 flex shrink-0 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-2">
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            <span className="hidden text-[10px] text-gray-400 sm:inline">
              {status.label}
            </span>
            <span className="text-[10px] text-gray-400 sm:hidden">
              {apiStatus === "online"
                ? "Online"
                : apiStatus === "checking"
                  ? "Checking"
                  : "Offline"}
            </span>
          </div>
        </header>

        {/* CHAT AREA */}
        <section className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 pb-6 pt-4 sm:px-7 sm:pt-6 lg:px-10">

            {/* REDESIGNED WELCOME SCREEN */}
          
{messages.length === 0 ? (
  <div className="flex min-h-full flex-col justify-center py-5 sm:py-7 lg:py-8">
    <div className="mx-auto grid w-full max-w-5xl items-center gap-7 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">

      {/* INTRODUCTION */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col justify-center"
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10">
            <BrainCircuit size={20} className="text-violet-300" />
          </div>

          <div>
            <p className="text-sm font-semibold text-white">
              Prince Gupta
            </p>
            <p className="text-[11px] text-gray-500">
              Portfolio AI Assistant
            </p>
          </div>
        </div>

        <div className="mb-4 w-fit rounded-full border border-violet-400/20 bg-violet-500/[0.07] px-3 py-1.5 text-[10px] font-semibold tracking-wide text-violet-300">
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
          EXPLORE MY PORTFOLIO
        </div>

        <h2 className="text-4xl font-bold leading-[1.12] tracking-tight sm:text-[46px]">
          Get to know
          <span className="block bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text pb-1 text-transparent">
            Prince Gupta.
          </span>
        </h2>

        <p className="mt-4 max-w-md text-sm leading-7 text-gray-400">
          Full Stack MERN Developer focused on Generative AI and
          Agentic AI. Explore my skills, projects, education and
          technical work through this AI assistant.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { icon: BrainCircuit, label: "MERN Stack" },
            { icon: Sparkles, label: "Generative AI" },
            { icon: Zap, label: "Agentic AI" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2"
            >
              <Icon size={14} className="text-violet-300" />
              <span className="text-[11px] text-gray-300">
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.08] pt-4">
          <span className="flex items-center gap-2 text-[10px] text-gray-500">
            <CheckCircle2 size={13} className="text-emerald-400" />
            Resume-based answers
          </span>
          <span className="flex items-center gap-2 text-[10px] text-gray-500">
            <Zap size={13} className="text-cyan-400" />
            RAG-powered
          </span>
        </div>
      </motion.div>

      {/* QUESTION PANEL */}
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border border-white/[0.09] bg-[#11111a]/90 p-4 sm:p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Explore my portfolio
            </h3>
            <p className="mt-1 text-[11px] text-gray-500">
              Select a topic to get started
            </p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
            <MessageSquare size={17} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {suggestions.map((item, index) => {
            const Icon = item.icon;

            return (
              <motion.button
                key={item.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + index * 0.05 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading || apiStatus !== "online"}
                onClick={() => askQuestion(item.question)}
                className="group flex min-h-[105px] flex-col justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5 text-left transition hover:border-violet-400/30 hover:bg-violet-500/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300 transition group-hover:bg-violet-500/20">
                    <Icon size={16} />
                  </div>

                  <ArrowUpRight
                    size={14}
                    className="text-gray-600 transition group-hover:text-violet-300"
                  />
                </div>

                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-200">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-gray-500">
                    {item.question}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>

        <p className="mt-4 border-t border-white/[0.06] pt-3 text-center text-[10px] text-gray-500">
          Or type your own question below
        </p>
      </motion.div>
    </div>
  </div>
) : (
  <div className="space-y-7 py-4">
    <div className="mb-7 flex items-center justify-between">
      <p className="text-xs text-gray-500">
        {messages.filter((message) => message.role === "user").length}{" "}
        question(s)
      </p>

      <button
        onClick={startNewChat}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-gray-400 transition hover:bg-white/[0.05] hover:text-white"
      >
        <Plus size={14} />
        New chat
      </button>
    </div>

    <AnimatePresence initial={false}>
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onCopy={copyAnswer}
          onRetry={() => askQuestion(lastQuestion)}
        />
      ))}
    </AnimatePresence>

    {loading && <LoadingMessage />}
    <div ref={bottomRef} />
  </div>
)}

          </div>
        </section>

        {/* INPUT FOOTER */}
        <footer className="sticky bottom-0 z-20 border-t border-white/[0.06] bg-[#09090f]/95 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:px-7 sm:pb-5 lg:px-10">
          <div className="mx-auto w-full max-w-4xl">
            <AnimatePresence>
              {notice && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="mb-3 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs text-gray-300"
                  role="status"
                >
                  <AlertCircle
                    size={15}
                    className="mt-0.5 shrink-0 text-violet-300"
                  />
                  <span className="flex-1">{notice}</span>
                  <button
                    onClick={() => setNotice("")}
                    className="text-gray-500 hover:text-white"
                    aria-label="Dismiss notice"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                askQuestion(question);
              }}
              className="w-full rounded-2xl border border-white/[0.12] bg-[#11111a] p-2 shadow-2xl shadow-black/20 transition duration-200 focus-within:border-violet-400/50 focus-within:ring-2 focus-within:ring-violet-500/10"
            >
              <label htmlFor="question" className="sr-only">
                Ask a question
              </label>

              <textarea
                id="question"
                ref={inputRef}
                value={question}
                onChange={(event) => {
                  setQuestion(event.target.value);
                  if (notice) setNotice("");
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    askQuestion(question);
                  }
                }}
                placeholder={
                  apiStatus === "offline"
                    ? "The assistant is offline right now..."
                    : apiStatus === "checking"
                      ? "Waking up the assistant, one moment..."
                      : "Ask about Prince's skills, projects or education..."
                }
                maxLength={500}
                rows={2}
                disabled={loading || apiStatus !== "online"}
                className="max-h-40 min-h-[54px] w-full resize-none bg-transparent px-3 py-3 text-base leading-6 text-gray-100 outline-none placeholder:text-gray-600 placeholder:transition-colors focus:placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[58px] sm:px-4 sm:text-sm"
              />

              <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-2 pt-2">
                <div className="flex min-w-0 items-center gap-2 text-[10px] text-gray-600">
                  <Sparkles size={13} className="shrink-0 text-violet-400" />
                  <span className="truncate">
                    Ask about skills, projects, or education
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={
                    loading ||
                    !question.trim() ||
                    apiStatus !== "online"
                  }
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-950/30 transition duration-200 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#11111a] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 sm:h-10 sm:w-10"
                  aria-label="Send question"
                >
                  {loading ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </form>

            <p className="mt-3 text-center text-[10px] leading-5 text-gray-600">
              Answers are generated only from Prince&apos;s resume and
              portfolio knowledge base. AI can still make mistakes, so verify
              important details with Prince.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
