import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Send, Bot, User, Flame, Thermometer, Snowflake,
  TrendingUp, Brain, MessageSquare, Wand2, RefreshCw, Copy,
  Target, Mail, BarChart3, CheckCircle2, AlertCircle, Zap
} from 'lucide-react'
import { MOCK_LEADS } from '../../utils/mockData'
import toast from 'react-hot-toast'

const API_KEY = (import.meta.env.VITE_OPENAI_KEY || '').trim()

const MODELS = ['gpt-4o-mini', 'gpt-3.5-turbo']

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function callGPT(messages, temperature = 0.7, max_tokens = 800) {
  if (!API_KEY || !API_KEY.startsWith('sk-')) {
    throw new Error('OpenAI key missing in .env — add VITE_OPENAI_KEY=sk-...')
  }
  // Try models in order, with retry on rate limit
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + API_KEY,
        },
        body: JSON.stringify({ model, messages, temperature, max_tokens }),
      })
      if (res.ok) {
        const data = await res.json()
        return data.choices[0].message.content
      }
      const err = await res.json().catch(() => ({}))
      if (res.status === 401) throw new Error('Invalid API key — regenerate at platform.openai.com/api-keys')
      if (res.status === 429) {
        // Rate limited — wait and retry, then try next model
        const wait = attempt * 2000
        await sleep(wait)
        if (attempt === 3) break // try next model
        continue
      }
      throw new Error(err.error?.message || `API error ${res.status}`)
    }
  }
  throw new Error('Rate limit on all models. Your OpenAI free tier quota may be exhausted — check platform.openai.com/usage')
}

function buildLeadContext() {
  return MOCK_LEADS.slice(0, 8).map(l =>
    `${l.name} (${l.company}): score=${l.score}, status=${l.status}, value=₹${l.value?.toLocaleString()}, source=${l.source}`
  ).join('\n')
}

const TABS = [
  { id: 'chat',     label: 'AI Chat',        icon: MessageSquare },
  { id: 'score',    label: 'Lead Scoring',   icon: Target },
  { id: 'email',    label: 'Email Writer',   icon: Mail },
  { id: 'predict',  label: 'Deal Predictor', icon: TrendingUp },
  { id: 'insights', label: 'AI Insights',    icon: BarChart3 },
]

function ChatBubble({ message }) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard?.writeText(message.content); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
        ${isUser ? 'bg-brand-600' : 'bg-gradient-to-br from-violet-500 to-brand-600'}`}>
        {isUser ? <User className="w-4 h-4 text-white"/> : <Bot className="w-4 h-4 text-white"/>}
      </div>
      <div className={`group relative max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
        ${isUser ? 'bg-brand-600 text-white rounded-tr-sm'
          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm rounded-tl-sm border border-slate-100 dark:border-slate-700'}`}>
        {message.loading
          ? <div className="flex gap-1.5 items-center py-1">
              {[0,150,300].map(d => <span key={d} className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{animationDelay:`${d}ms`}}/>)}
            </div>
          : <>
              <div className="whitespace-pre-wrap">{message.content}</div>
              {!isUser && (
                <button onClick={copy} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-slate-100 dark:bg-slate-700 transition-opacity">
                  {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500"/> : <Copy className="w-3 h-3 text-slate-400"/>}
                </button>
              )}
            </>}
      </div>
    </motion.div>
  )
}

function AIChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm NexaAI powered by GPT-4o. I have full context of your CRM — ask me anything about your leads, pipeline, deals, or let me draft emails and predict outcomes." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const QUICK = [
    'Which leads should I prioritize today?',
    'Write a follow-up email for my hottest lead',
    "What's blocking my pipeline?",
    'Give me 3 tips to close more deals this week',
  ]

  const send = async (text) => {
    const msg = text || input.trim(); if (!msg || loading) return
    setInput('')
    setMessages(p => [...p, { role:'user', content:msg }, { role:'assistant', loading:true, content:'' }])
    setLoading(true)
    try {
      const system = `You are NexaAI, an expert CRM assistant. CRM data:\n${buildLeadContext()}\nBe concise, specific, actionable. Use bullet points and emojis.`
      const history = messages.filter(m => !m.loading).map(m => ({ role: m.role, content: m.content }))
      const reply = await callGPT([{ role:'system', content:system }, ...history, { role:'user', content:msg }])
      setMessages(p => [...p.slice(0,-1), { role:'assistant', content:reply }])
    } catch(e) {
      setMessages(p => [...p.slice(0,-1), { role:'assistant', content:`❌ ${e.message}` }])
      toast.error(e.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col h-[600px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((m, i) => <ChatBubble key={i} message={m}/>)}
        <div ref={bottomRef}/>
      </div>
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {QUICK.map(q => (
            <button key={q} onClick={() => send(q)}
              className="text-xs px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 hover:bg-brand-100 transition-colors">
              {q}
            </button>
          ))}
        </div>
      )}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex gap-3 items-end">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()} }}
            placeholder="Ask NexaAI anything…" rows={2} className="flex-1 input resize-none text-sm"/>
          <button onClick={() => send()} disabled={!input.trim()||loading}
            className="btn-primary p-3 rounded-xl disabled:opacity-50 flex-shrink-0"><Send className="w-4 h-4"/></button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 text-center">Powered by GPT-4o · NexaCRM AI</p>
      </div>
    </div>
  )
}

function LeadScoring() {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(false)
  const SCORE_STYLE = {
    hot:  { icon: Flame,       cls: 'text-red-600 bg-red-50 dark:bg-red-900/20',    bar: 'bg-red-500' },
    warm: { icon: Thermometer, cls: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', bar: 'bg-amber-500' },
    cold: { icon: Snowflake,   cls: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',  bar: 'bg-blue-500' },
  }
  const run = async () => {
    setLoading(true); setScores([])
    try {
      const prompt = `Score these CRM leads. Return ONLY a JSON array:
[{"id":1,"name":"...","aiScore":"hot|warm|cold","confidence":85,"reason":"...","nextAction":"..."}]
Leads: ${JSON.stringify(MOCK_LEADS.slice(0,8).map(l=>({id:l.id,name:l.name,company:l.company,source:l.source,status:l.status,value:l.value})))}`
      const reply = await callGPT([{ role:'user', content:prompt }], 0.3, 1200)
      const json = reply.match(/\[[\s\S]*\]/)?.[0]
      if (!json) throw new Error('Unexpected response format')
      setScores(JSON.parse(json))
      toast.success('AI scoring complete!')
    } catch(e) { toast.error(e.message) }
    finally { setLoading(false) }
  }
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200">AI Lead Scoring</h3>
          <p className="text-xs text-slate-500 mt-0.5">GPT-4o scores every lead with confidence % and next action</p>
        </div>
        <button onClick={run} disabled={loading} className="btn-primary text-xs gap-2 disabled:opacity-60">
          <Brain className={`w-3.5 h-3.5 ${loading?'animate-pulse':''}`}/>
          {loading?'Scoring…':scores.length?'Re-score':'Score All Leads'}
        </button>
      </div>
      {!scores.length && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mb-4"><Target className="w-8 h-8 text-brand-500"/></div>
          <p className="text-slate-500 text-sm">Click "Score All Leads" to run GPT-4o analysis</p>
        </div>
      )}
      {loading && <div className="flex flex-col items-center justify-center py-16"><RefreshCw className="w-8 h-8 text-brand-500 animate-spin mb-3"/><p className="text-sm text-slate-500">GPT-4o is analyzing your leads…</p></div>}
      {scores.length > 0 && (
        <div className="space-y-3">
          {scores.map((s, i) => {
            const st = SCORE_STYLE[s.aiScore] || SCORE_STYLE.warm; const Icon = st.icon
            return (
              <motion.div key={s.id||i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}} className="glass-card p-4 flex items-start gap-4">
                <div className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold flex-shrink-0 ${st.cls}`}>
                  <Icon className="w-3.5 h-3.5"/> {(s.aiScore||'').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{s.name}</p>
                    <span className="text-xs font-bold text-slate-500">{s.confidence}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mt-1.5 mb-2">
                    <div className={`h-1.5 rounded-full ${st.bar}`} style={{width:`${s.confidence}%`}}/>
                  </div>
                  <p className="text-xs text-slate-500">{s.reason}</p>
                  <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mt-1">→ {s.nextAction}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EmailWriter() {
  const [lead, setLead] = useState(MOCK_LEADS[0]?.name||'')
  const [type, setType] = useState('follow-up')
  const [tone, setTone] = useState('professional')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const selectedLead = MOCK_LEADS.find(l=>l.name===lead)||MOCK_LEADS[0]
  const generate = async () => {
    setLoading(true); setResult('')
    try {
      const prompt = `Write a ${tone} ${type} sales email.
Lead: ${selectedLead?.name}, Company: ${selectedLead?.company}, Status: ${selectedLead?.status}, Value: ₹${selectedLead?.value?.toLocaleString()}.
Include Subject line, greeting, 2-3 paragraph body, clear CTA, and sign-off. Be compelling and concise.`
      const reply = await callGPT([{ role:'user', content:prompt }], 0.8, 600)
      setResult(reply); toast.success('Email generated!')
    } catch(e) { toast.error(e.message) }
    finally { setLoading(false) }
  }
  const copy = () => { navigator.clipboard?.writeText(result); toast.success('Copied!') }
  return (
    <div className="p-6 space-y-5">
      <div><h3 className="font-bold text-slate-800 dark:text-slate-200">AI Email Writer</h3><p className="text-xs text-slate-500 mt-0.5">GPT-4o generates personalized emails for any lead</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Lead</label>
          <select value={lead} onChange={e=>setLead(e.target.value)} className="input text-sm w-full">
            {MOCK_LEADS.map(l=><option key={l.id} value={l.name}>{l.name} — {l.company}</option>)}
          </select></div>
        <div><label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Type</label>
          <select value={type} onChange={e=>setType(e.target.value)} className="input text-sm w-full">
            {['follow-up','introduction','proposal','re-engagement','meeting request','thank you','closing'].map(t=>(
              <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
            ))}
          </select></div>
        <div><label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Tone</label>
          <select value={tone} onChange={e=>setTone(e.target.value)} className="input text-sm w-full">
            {['professional','friendly','urgent','formal','casual'].map(t=>(
              <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
            ))}
          </select></div>
      </div>
      <button onClick={generate} disabled={loading} className="btn-primary text-xs gap-2 disabled:opacity-60">
        <Wand2 className={`w-3.5 h-3.5 ${loading?'animate-pulse':''}`}/>{loading?'Writing…':'Generate Email'}
      </button>
      {result && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="relative">
          <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 font-sans leading-relaxed max-h-72 overflow-y-auto custom-scrollbar">{result}</pre>
          <button onClick={copy} className="absolute top-3 right-3 btn-secondary text-xs gap-1.5 py-1"><Copy className="w-3 h-3"/> Copy</button>
        </motion.div>
      )}
    </div>
  )
}

function DealPredictor() {
  const [lead, setLead] = useState(MOCK_LEADS[0]?.name||'')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const selectedLead = MOCK_LEADS.find(l=>l.name===lead)||MOCK_LEADS[0]
  const predict = async () => {
    setLoading(true); setResult(null)
    try {
      const prompt = `Analyze this CRM lead and predict deal outcome. Return ONLY JSON:
{"winProbability":75,"timeToClose":"2-3 weeks","predictedValue":250000,"strengths":["..."],"risks":["..."],"actions":["..."]}
Lead: ${JSON.stringify({ name:selectedLead?.name, company:selectedLead?.company, score:selectedLead?.score, status:selectedLead?.status, value:selectedLead?.value, source:selectedLead?.source })}`
      const reply = await callGPT([{ role:'user', content:prompt }], 0.3, 500)
      const json = reply.match(/\{[\s\S]*\}/)?.[0]
      if (!json) throw new Error('Unexpected response')
      setResult(JSON.parse(json)); toast.success('Prediction ready!')
    } catch(e) { toast.error(e.message) }
    finally { setLoading(false) }
  }
  return (
    <div className="p-6 space-y-5">
      <div><h3 className="font-bold text-slate-800 dark:text-slate-200">Deal Success Predictor</h3><p className="text-xs text-slate-500 mt-0.5">GPT-4o predicts win probability, close timeline, risks</p></div>
      <div className="flex gap-3 items-end">
        <div className="flex-1"><label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Select Lead</label>
          <select value={lead} onChange={e=>setLead(e.target.value)} className="input text-sm w-full">
            {MOCK_LEADS.map(l=><option key={l.id} value={l.name}>{l.name} — {l.company} (₹{l.value?.toLocaleString()})</option>)}
          </select></div>
        <button onClick={predict} disabled={loading} className="btn-primary text-xs gap-2 disabled:opacity-60 flex-shrink-0">
          <TrendingUp className={`w-3.5 h-3.5 ${loading?'animate-pulse':''}`}/>{loading?'Analyzing…':'Predict'}
        </button>
      </div>
      {result && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-4">
          <div className="glass-card p-5 text-center">
            <p className="text-xs text-slate-500 mb-1">Win Probability</p>
            <div className="text-5xl font-black mb-2" style={{color:result.winProbability>=70?'#10b981':result.winProbability>=40?'#f59e0b':'#ef4444'}}>{result.winProbability}%</div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3">
              <motion.div className="h-3 rounded-full" initial={{width:0}} animate={{width:`${result.winProbability}%`}} transition={{duration:1,ease:'easeOut'}}
                style={{background:result.winProbability>=70?'#10b981':result.winProbability>=40?'#f59e0b':'#ef4444'}}/>
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-3">
              <span>⏱ {result.timeToClose}</span><span>💰 ₹{result.predictedValue?.toLocaleString()}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="glass-card p-4"><p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/>Strengths</p>
              {result.strengths?.map((s,i)=><p key={i} className="text-xs text-slate-600 dark:text-slate-400 mt-1">• {s}</p>)}</div>
            <div className="glass-card p-4"><p className="text-xs font-bold text-red-500 mb-2 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5"/>Risks</p>
              {result.risks?.map((r,i)=><p key={i} className="text-xs text-slate-600 dark:text-slate-400 mt-1">• {r}</p>)}</div>
            <div className="glass-card p-4"><p className="text-xs font-bold text-brand-600 dark:text-brand-400 mb-2 flex items-center gap-1"><Zap className="w-3.5 h-3.5"/>Actions</p>
              {result.actions?.map((a,i)=><p key={i} className="text-xs text-slate-600 dark:text-slate-400 mt-1">→ {a}</p>)}</div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

function AIInsights() {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(false)
  const STYLE = {
    success: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
    warning: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
    info:    'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  }
  const generate = async () => {
    setLoading(true); setInsights(null)
    try {
      const total=MOCK_LEADS.length, hot=MOCK_LEADS.filter(l=>l.score==='hot').length
      const totalVal=MOCK_LEADS.reduce((s,l)=>s+(l.value||0),0)
      const prompt = `CRM data: ${total} leads, ${hot} hot, ₹${totalVal.toLocaleString()} pipeline.
Sources: ${[...new Set(MOCK_LEADS.map(l=>l.source))].map(s=>s+':'+MOCK_LEADS.filter(l=>l.source===s).length).join(', ')}
Return ONLY JSON: {"summary":"...","alerts":[{"type":"warning|success|info","title":"...","detail":"..."}],"recommendations":[{"title":"...","impact":"High|Medium|Low","action":"..."}],"forecast":"..."}`
      const reply = await callGPT([{ role:'user', content:prompt }], 0.5, 800)
      const json = reply.match(/\{[\s\S]*\}/)?.[0]
      if (!json) throw new Error('Unexpected response')
      setInsights(JSON.parse(json)); toast.success('Insights ready!')
    } catch(e) { toast.error(e.message) }
    finally { setLoading(false) }
  }
  const IMPACT = { High:'text-red-500', Medium:'text-amber-500', Low:'text-green-500' }
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h3 className="font-bold text-slate-800 dark:text-slate-200">AI Business Insights</h3><p className="text-xs text-slate-500 mt-0.5">GPT-4o surfaces key patterns from your CRM data</p></div>
        <button onClick={generate} disabled={loading} className="btn-primary text-xs gap-2 disabled:opacity-60">
          <Sparkles className={`w-3.5 h-3.5 ${loading?'animate-pulse':''}`}/>{loading?'Analyzing…':insights?'Refresh':'Generate Insights'}
        </button>
      </div>
      {!insights&&!loading&&<div className="flex flex-col items-center justify-center py-16 text-center"><div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center mb-4"><BarChart3 className="w-8 h-8 text-violet-500"/></div><p className="text-slate-500 text-sm">Click "Generate Insights" to analyze your CRM</p></div>}
      {loading&&<div className="flex flex-col items-center justify-center py-16"><Brain className="w-8 h-8 text-violet-500 animate-pulse mb-3"/><p className="text-sm text-slate-500">GPT-4o is analyzing…</p></div>}
      {insights && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-4">
          <div className="glass-card p-4 border-l-4 border-brand-500"><p className="text-xs font-bold text-brand-600 dark:text-brand-400 mb-1">📊 Summary</p><p className="text-sm text-slate-700 dark:text-slate-300">{insights.summary}</p></div>
          {insights.alerts?.map((a,i)=>(
            <div key={i} className={`p-4 rounded-xl border ${STYLE[a.type]||STYLE.info}`}>
              <p className="text-sm font-bold">{a.title}</p><p className="text-xs mt-0.5 opacity-80">{a.detail}</p>
            </div>
          ))}
          {insights.recommendations?.map((r,i)=>(
            <div key={i} className="glass-card p-4 flex items-start gap-3">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 flex-shrink-0 ${IMPACT[r.impact]||''}`}>{r.impact}</span>
              <div><p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{r.title}</p><p className="text-xs text-slate-500 mt-0.5">→ {r.action}</p></div>
            </div>
          ))}
          {insights.forecast&&<div className="glass-card p-4 border-l-4 border-emerald-500"><p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">📅 Forecast</p><p className="text-sm text-slate-700 dark:text-slate-300">{insights.forecast}</p></div>}
        </motion.div>
      )}
    </div>
  )
}

export default function AIEnginePage() {
  const [activeTab, setActiveTab] = useState('chat')
  const keyOk = API_KEY.startsWith('sk-')
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-violet-500"/> AI Engine
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Powered by GPT-4o — real intelligence for your CRM</p>
        </div>
        <div className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl border ${keyOk
          ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
          : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'}`}>
          <span className={`w-2 h-2 rounded-full ${keyOk?'bg-emerald-500 animate-pulse':'bg-amber-400'}`}/>
          {keyOk ? 'GPT-4o Connected' : 'API key not set in .env'}
        </div>
      </div>
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit flex-wrap">
        {TABS.map(tab => { const Icon=tab.icon; return (
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab===tab.id?'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm':'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            <Icon className="w-3.5 h-3.5"/>{tab.label}
          </button>
        )})}
      </div>
      <div className="glass-card overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}} transition={{duration:0.15}}>
            {activeTab==='chat'     && <AIChat/>}
            {activeTab==='score'    && <LeadScoring/>}
            {activeTab==='email'    && <EmailWriter/>}
            {activeTab==='predict'  && <DealPredictor/>}
            {activeTab==='insights' && <AIInsights/>}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
