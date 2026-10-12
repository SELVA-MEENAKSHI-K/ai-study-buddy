import { useEffect, useRef, useState } from 'react';
import { BookOpen, Bot, Check, ChevronDown, CircleHelp, Clock3, Code2, Command, GraduationCap, History, Lightbulb, LoaderCircle, MessageCircle, Plus, RotateCcw, Send, Sparkles, WandSparkles, X } from 'lucide-react';

const modes = [
  { id: 'beginner', name: 'Beginner', note: 'Simple explanations, no jargon', icon: Lightbulb },
  { id: 'exam', name: 'Exam prep', note: 'Definitions and key points', icon: GraduationCap },
  { id: 'practical', name: 'Practical', note: 'Examples and mini exercises', icon: Code2 },
];
const examples = ['Explain recursion with a simple example', 'What is the difference between a list and a linked list?', 'Give me a practice question about SQL joins'];
const initialMessage = { role: 'assistant', content: 'Hi! I’m your study buddy. Ask me about programming or computer science, and we’ll work through it together.' };

function getSaved() {
  try { return JSON.parse(sessionStorage.getItem('studybuddy-session') || '{}'); } catch { return {}; }
}

export default function App() {
  const saved = useRef(getSaved()).current;
  const [mode, setMode] = useState(saved.mode || 'beginner');
  const [messages, setMessages] = useState(saved.messages || [initialMessage]);
  const [history, setHistory] = useState(saved.history || []);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastQuestion, setLastQuestion] = useState('');
  const [mobileHistory, setMobileHistory] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { sessionStorage.setItem('studybuddy-session', JSON.stringify({ mode, messages, history })); }, [mode, messages, history]);
  useEffect(() => endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }), [messages, busy, error]);

  async function requestAnswer(question, anotherWay = false) {
    if (!question.trim() || busy) return;
    setError(''); setBusy(true); setLastQuestion(question);
    const historyToSend = anotherWay ? messages : messages;
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, mode, history: historyToSend.slice(-12), explain_another_way: anotherWay }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || 'I couldn’t reach the study buddy. Please try again.');
      setMessages(current => [...current, { role: 'assistant', content: data.answer, alternate: anotherWay }]);
      if (!anotherWay) setHistory(current => [{ question, mode, time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), id: Date.now() }, ...current.filter(item => item.question !== question)].slice(0, 10));
    } catch (err) {
      setError(err.name === 'TypeError' ? 'I can’t reach the study buddy right now. Check that the app is running, then retry.' : err.message);
    } finally { setBusy(false); }
  }

  function send(e) { e?.preventDefault(); const q = input.trim(); if (!q || busy) return; setMessages(current => [...current, { role: 'user', content: q }]); setInput(''); requestAnswer(q); }
  function retry() { if (lastQuestion) requestAnswer(lastQuestion); }
  function explainAnotherWay() { if (!lastQuestion || busy) return; requestAnswer(lastQuestion, true); }
  function reset() { setMessages([initialMessage]); setHistory([]); setError(''); setLastQuestion(''); sessionStorage.removeItem('studybuddy-session'); }
  function revisit(item) { setInput(item.question); setMobileHistory(false); document.querySelector('#question')?.focus(); }

  return <div className="layout">
    <aside className={`sidebar ${mobileHistory ? 'sidebar-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Sparkles size={19}/></span><span>studybuddy</span></div>
      <div className="side-actions"><button className="new-chat" onClick={reset}><Plus size={17}/> New conversation</button><button className="history-toggle" onClick={() => setMobileHistory(v => !v)}><History size={17}/> Recent questions <ChevronDown size={14}/></button></div>
      <div className="history-list"><p className="eyebrow">THIS SESSION</p>{history.length ? history.map(item => <button key={item.id} className="history-item" onClick={() => revisit(item)}><MessageCircle size={15}/><span>{item.question}</span></button>) : <div className="history-empty"><Clock3 size={16}/><span>Your recent questions will show up here.</span></div>}</div>
      <div className="sidebar-foot"><div className="privacy-icon"><Check size={13}/></div><span>Your session stays in this browser tab.</span></div>
      <button className="mobile-close" onClick={() => setMobileHistory(false)} aria-label="Close recent questions"><X/></button>
    </aside>
    <main className="main">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileHistory(true)} aria-label="Open recent questions"><History size={19}/></button><div className="topbar-label">YOUR LEARNING SPACE</div><button className="reset-button" onClick={reset}><RotateCcw size={15}/><span>Reset chat</span></button></header>
      <section className="content">
        <div className="welcome"><div className="welcome-icon"><Sparkles size={22}/></div><p className="eyebrow">A FRIENDLY PLACE TO FIGURE IT OUT</p><h1>Learn it <span>your way.</span></h1><p className="welcome-copy">Stuck on a concept? Curious how something works? Let’s make it click.</p></div>
        <section className="mode-section"><div className="section-title"><span>Choose your learning style</span><CircleHelp size={15} title="You can change modes at any time"/></div><div className="modes">{modes.map(({id,name,note,icon: Icon}) => <button key={id} className={`mode-card ${mode === id ? 'selected' : ''}`} onClick={() => setMode(id)} aria-pressed={mode === id}><span className="mode-icon"><Icon size={17}/></span><span className="mode-text"><strong>{name}</strong><small>{note}</small></span>{mode === id && <span className="mode-check"><Check size={12}/></span>}</button>)}</div></section>
        <section className="conversation" aria-live="polite">
          {messages.length === 1 ? <div className="starter"><div className="starter-top"><span className="bot-avatar"><Bot size={17}/></span><div><strong>Start with a question</strong><small>There’s no such thing as a silly one.</small></div></div><div className="examples">{examples.map(example => <button key={example} onClick={() => { setMessages(current => [...current, { role: 'user', content: example }]); requestAnswer(example); }}><span>{example}</span><Send size={14}/></button>)}</div></div> : <div className="messages">{messages.slice(1).map((message, i) => <article className={`message ${message.role}`} key={`${i}-${message.content.slice(0,12)}`}><div className="message-avatar">{message.role === 'assistant' ? <Sparkles size={15}/> : 'Y'}</div><div className="message-body"><div className="message-label">{message.role === 'assistant' ? 'STUDY BUDDY' : 'YOU'}{message.alternate && <span className="another-tag">ANOTHER WAY</span>}</div><p>{message.content}</p>{message.role === 'assistant' && i === messages.slice(1).length - 1 && !busy && <button className="another-way" onClick={explainAnotherWay}><WandSparkles size={14}/> Explain it another way</button>}</div></article>)}{busy && <div className="loading-row"><span className="bot-avatar"><Bot size={17}/></span><div><LoaderCircle className="spin" size={16}/><span>Thinking it through…</span></div></div>}{error && <div className="error-card" role="alert"><div><strong>We hit a little snag</strong><p>{error}</p></div><button onClick={retry}><RotateCcw size={14}/> Try again</button></div>}</div>}
          <div ref={endRef}/>
        </section>
        <form className="composer" onSubmit={send}><label className="sr-only" htmlFor="question">Ask a study question</label><textarea id="question" rows="1" placeholder="Ask a question about programming or computer science…" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }} maxLength={4000}/><div className="composer-bottom"><span><Command size={12}/> Enter to send · Shift + Enter for a new line</span><button type="submit" disabled={!input.trim() || busy} aria-label="Send question"><Send size={16}/></button></div></form>
        <footer className="disclaimer"><BookOpen size={13}/> Think of Studybuddy as a learning companion. Double-check anything important.</footer>
      </section>
    </main>
  </div>;
}
