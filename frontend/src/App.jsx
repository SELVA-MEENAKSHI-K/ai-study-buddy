import { useEffect, useRef, useState } from 'react';
import { BookOpen, Bot, Check, ChevronDown, CircleHelp, Clock3, Code2, FileText, GraduationCap, History, Lightbulb, LoaderCircle, MessageCircle, Plus, RotateCcw, Send, Sparkles, WandSparkles, X, Menu, Trash2, ClipboardList, Settings } from 'lucide-react';

const modes = [
  { id: 'beginner', name: 'Beginner', note: 'Simple explanations', icon: Lightbulb },
  { id: 'exam', name: 'Exam prep', note: 'Definitions and key points', icon: GraduationCap },
  { id: 'practical', name: 'Practical', note: 'Examples and exercises', icon: Code2 },
];
const starters = [
  { title: 'Understand a concept', text: 'Learn a difficult topic in simple English.', icon: BookOpen, prompt: 'Explain recursion with a simple example' },
  { title: 'Practise with questions', text: 'Try a short quiz on a topic you choose.', icon: ClipboardList, view: 'quiz' },
  { title: 'Explain my code', text: 'Paste code and understand it step by step.', icon: Code2, view: 'code' },
  { title: 'Prepare for exams', text: 'Turn a topic into clear revision notes.', icon: FileText, view: 'notes' },
];
const initialMessage = { role: 'assistant', content: 'Hi! I’m your Study Master. Ask me about programming or computer science, and we’ll work through it together.' };
function freshConversation() { return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, title: 'New conversation', mode: 'beginner', messages: [initialMessage], updatedAt: Date.now() }; }
function loadSession() {
  try { const saved = JSON.parse(sessionStorage.getItem('studybuddy-session') || '{}'); return saved.conversations?.length ? saved : { conversations: [freshConversation()], activeId: null }; } catch { return { conversations: [freshConversation()], activeId: null }; }
}
function Markdown({ text }) {
  const lines = String(text || '').split('\n');
  const blocks = []; let codeLines = null;
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) { if (codeLines) { blocks.push(<pre className="code-block" key={`code-${i}`}><code>{codeLines.join('\n')}</code></pre>); codeLines = null; } else codeLines = []; return; }
    if (codeLines) { codeLines.push(line); return; }
    if (/^#{1,3}\s/.test(trimmed)) blocks.push(<strong className="md-heading" key={i}>{trimmed.replace(/^#{1,3}\s/, '')}</strong>);
    else if (/^[-*]\s/.test(trimmed)) blocks.push(<div className="md-list" key={i}>• {inlineMarkdown(trimmed.slice(2))}</div>);
    else if (/^\d+[.)]\s/.test(trimmed)) blocks.push(<div className="md-list" key={i}>{inlineMarkdown(trimmed)}</div>);
    else if (!trimmed) blocks.push(<div className="md-gap" key={i}/>);
    else blocks.push(<p key={i}>{inlineMarkdown(trimmed)}</p>);
  });
  if (codeLines) blocks.push(<pre className="code-block" key="code-final"><code>{codeLines.join('\n')}</code></pre>);
  return <div className="markdown">{blocks}</div>;
}
function inlineMarkdown(value) {
  return value.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith('`') ? <code key={i}>{part.slice(1, -1)}</code> : part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part);
}

export default function App() {
  const initial = useRef(loadSession()).current;
  const [conversations, setConversations] = useState(initial.conversations);
  const [activeId, setActiveId] = useState(initial.activeId || initial.conversations[0]?.id);
  const active = conversations.find(item => item.id === activeId) || conversations[0] || freshConversation();
  const [mode, setMode] = useState(active.mode || 'beginner');
  const [view, setView] = useState('chat');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retryRequest, setRetryRequest] = useState(null);
  const [mobileHistory, setMobileHistory] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [quizTopic, setQuizTopic] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [quizChoice, setQuizChoice] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [notes, setNotes] = useState('');
  const [code, setCode] = useState('');
  const endRef = useRef(null);
  const messages = active.messages;
  const lastUser = [...messages].reverse().find(message => message.role === 'user')?.content || '';

  useEffect(() => { sessionStorage.setItem('studybuddy-session', JSON.stringify({ conversations, activeId })); }, [conversations, activeId]);
  useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }); }, [messages, busy, error]);
  function updateActive(transform) { setConversations(current => current.map(item => { if (item.id !== activeId) return item; const updated = transform(item); return { ...updated, messages: updated.messages.slice(-80) }; })); }
  function addMessage(message) { updateActive(item => ({ ...item, title: item.messages.length === 1 && message.role === 'user' ? message.content.slice(0, 52) : item.title, messages: [...item.messages, message], updatedAt: Date.now() })); }
  async function requestAnswer(question, action = 'chat', requestMode = mode) {
    if (!question.trim() || busy) return;
    setError(''); setRetryRequest({ question, action, mode: requestMode }); setBusy(true);
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, mode: requestMode, history: messages.slice(-12), action }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || 'I couldn’t reach the Study Master. Please try again.');
      if (typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('The Study Master sent an unreadable response. Your question is still here. Please try again.');
      addMessage({ role: 'assistant', content: data.answer, action });
      setRetryRequest(null);
    } catch (err) {
      setError(err.name === 'TypeError' ? 'I can’t reach the Study Master right now. Check that the app is running, then retry.' : err.message);
    } finally { setBusy(false); }
  }
  function sendQuestion(question = input, action = 'chat') {
    const q = question.trim(); if (!q || busy) return;
    addMessage({ role: 'user', content: q }); setInput(''); setView('chat'); requestAnswer(q, action);
  }
  function retry() { if (retryRequest) requestAnswer(retryRequest.question, retryRequest.action, retryRequest.mode); else if (lastUser) requestAnswer(lastUser); }
  function newChat() { const chat = freshConversation(); setConversations(current => [chat, ...current].slice(0, 10)); setActiveId(chat.id); setMode(chat.mode); setView('chat'); setError(''); setRetryRequest(null); setMobileHistory(false); }
  function openConversation(item) { setActiveId(item.id); setMode(item.mode || 'beginner'); setView('chat'); setError(''); setRetryRequest(null); setMobileHistory(false); }
  function clearHistory() { const chat = freshConversation(); setConversations([chat]); setActiveId(chat.id); setMode(chat.mode); setConfirmClear(false); setView('chat'); setError(''); setRetryRequest(null); }
  async function runQuiz(next = false) {
    const topic = quizTopic.trim(); if (!topic || busy) return;
    if (!next) { setQuizScore(0); setQuizCount(1); setQuizFinished(false); }
    setBusy(true); setError(''); setQuiz(null); setQuizResult(null); setQuizChoice(null);
    try { const response = await fetch('/api/quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, mode }) }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.detail || 'The quiz could not be generated. Please retry.'); if (typeof data.topic !== 'string' || typeof data.question !== 'string' || !data.question.trim() || !Array.isArray(data.options) || data.options.length !== 4 || !data.options.every(option => typeof option === 'string' && option.trim()) || !Number.isInteger(data.correct_index) || data.correct_index < 0 || data.correct_index > 3 || typeof data.explanation !== 'string' || !data.explanation.trim()) throw new Error('The quiz came back in an unreadable format. Your topic is still here. Please try again.'); setQuiz(data); }
    catch (err) { setError(err.name === 'TypeError' ? 'I can’t reach the Study Master right now. Check that the app is running, then retry.' : err.message); }
    finally { setBusy(false); }
  }
  async function runTool(kind) { const value = kind === 'notes' ? notes.trim() : code.trim(); if (!value || busy) return; const label = kind === 'notes' ? 'Simplify these study notes and extract the key points. Keep to the information provided; clearly label any extra context.' : 'Explain this code line by line, describe expected output only if it can be reasoned about, identify likely errors, and suggest corrections.'; addMessage({ role: 'user', content: `${label}\n\n${value}` }); setView('chat'); requestAnswer(`${label}\n\n${value}`, kind); }

  return <div className="layout">
    <aside className={`sidebar ${mobileHistory ? 'sidebar-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Sparkles size={19}/></span><span>Study Master</span></div>
      <div className="side-actions"><button className="new-chat" onClick={newChat}><Plus size={17}/> New chat</button><p className="nav-label">LEARN</p><button className={`nav-item ${view === 'chat' ? 'active' : ''}`} onClick={() => setView('chat')}><MessageCircle size={16}/> Study chat</button><button className={`nav-item ${view === 'quiz' ? 'active' : ''}`} onClick={() => { setView('quiz'); setMobileHistory(false); }}><ClipboardList size={16}/> Practice quiz</button><button className={`nav-item ${view === 'code' ? 'active' : ''}`} onClick={() => { setView('code'); setMobileHistory(false); }}><Code2 size={16}/> Explain my code</button><button className={`nav-item ${view === 'notes' ? 'active' : ''}`} onClick={() => { setView('notes'); setMobileHistory(false); }}><FileText size={16}/> Simplify notes</button><button className="history-toggle" onClick={() => setMobileHistory(value => !value)}><History size={16}/> Recent questions <ChevronDown size={14}/></button><p className="nav-label mode-nav-label">LEARNING MODES</p><div className="sidebar-modes">{modes.map(({id,name,icon:Icon})=><button key={id} className={`sidebar-mode ${mode===id?'selected':''}`} aria-pressed={mode===id} onClick={()=>{setMode(id);updateActive(item=>({...item,mode:id}));}}><Icon size={15}/><span>{name}</span>{mode===id&&<Check size={13} className="sidebar-mode-check"/>}</button>)}</div><button className={`nav-item settings-link ${view === 'settings' ? 'active' : ''}`} onClick={() => { setView('settings'); setMobileHistory(false); }}><Settings size={16}/> Settings</button></div>
      <div className="history-list"><p className="eyebrow">THIS SESSION</p>{conversations.filter(item => item.messages.length > 1).length ? conversations.filter(item => item.messages.length > 1).map(item => <button key={item.id} className={`history-item ${item.id === activeId ? 'history-active' : ''}`} onClick={() => openConversation(item)}><MessageCircle size={15}/><span>{item.title}</span></button>) : <div className="history-empty"><Clock3 size={16}/><span>Your recent questions will show up here.</span></div>}</div>
      <div className="history-actions"><button onClick={() => setConfirmClear(true)}><Trash2 size={14}/> Clear history</button></div>
      <div className="sidebar-foot"><div className="privacy-icon"><Check size={13}/></div><span>Your chats stay in this browser tab.</span></div>
      <button className="mobile-close" onClick={() => setMobileHistory(false)} aria-label="Close recent questions"><X/></button>
    </aside>
    <main className="main">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileHistory(true)} aria-label="Open navigation"><Menu size={19}/></button><div className="topbar-label">YOUR LEARNING SPACE</div><button className="reset-button" onClick={newChat}><RotateCcw size={15}/><span>New chat</span></button></header>
      <section className="content">
        {view === 'chat' && <>
          {messages.length === 1 && <><div className="welcome"><div className="welcome-icon"><Sparkles size={22}/></div><p className="eyebrow">A FRIENDLY PLACE TO FIGURE IT OUT</p><h1>What would you like<br/>to <span>learn today?</span></h1><p className="welcome-copy">Your personal AI study companion for understanding concepts, practising skills, and preparing for exams.</p></div>
          <div className="starter-grid">{starters.map(({title,text,icon:Icon,prompt,view:nextView}) => <button className="starter-card" key={title} onClick={() => prompt ? sendQuestion(prompt) : setView(nextView)}><Icon size={18}/><strong>{title}</strong><span>{text}</span></button>)}</div></>}
          <section className="mode-section"><div className="section-title"><span>Choose your learning style</span><CircleHelp size={15} title="Your choice guides new answers"/></div><div className="modes">{modes.map(({id,name,note,icon:Icon}) => <button key={id} className={`mode-card ${mode === id ? 'selected' : ''}`} onClick={() => { setMode(id); updateActive(item => ({ ...item, mode: id })); }} aria-pressed={mode === id}><span className="mode-icon"><Icon size={17}/></span><span className="mode-text"><strong>{name}</strong><small>{note}</small></span>{mode === id && <span className="mode-check"><Check size={12}/></span>}</button>)}</div></section>
          <section className="conversation" aria-live="polite">{messages.length > 1 && <div className="messages">{messages.slice(1).map((message, i) => <article className={`message ${message.role}`} key={`${i}-${message.content.slice(0,12)}`}><div className="message-avatar">{message.role === 'assistant' ? <Sparkles size={15}/> : 'Y'}</div><div className="message-body"><div className="message-label">{message.role === 'assistant' ? 'STUDY MASTER' : 'YOU'}{message.action && message.action !== 'chat' && <span className="another-tag">{message.action.replaceAll('_', ' ')}</span>}</div><div className="message-content"><Markdown text={message.content}/></div>{message.role === 'assistant' && i === messages.slice(1).length - 1 && <div className="response-actions"><div className="response-actions-title"><WandSparkles size={14}/><span>Explain it another way</span></div><button onClick={() => requestAnswer(lastUser, 'explain_simple')} disabled={busy}><Lightbulb size={13}/> Explain simply</button><button onClick={() => requestAnswer(lastUser, 'real_world_example')} disabled={busy}><WandSparkles size={13}/> Real-world example</button><button onClick={() => requestAnswer(lastUser, 'exam_answer')} disabled={busy}><GraduationCap size={13}/> Exam answer</button></div>}</div></article>)}{busy && <div className="loading-row"><span className="bot-avatar"><Bot size={17}/></span><div><LoaderCircle className="spin" size={16}/><span>Thinking it through…</span></div></div>}{error && <div className="error-card" role="alert"><div><strong>We hit a little snag</strong><p>{error}</p></div><button onClick={retry}><RotateCcw size={14}/> Try again</button></div>}</div>}<div ref={endRef}/></section>
          {messages.length > 1 && !busy && <div className="followups" aria-label="Suggested follow-ups"><span>Keep learning</span><button onClick={() => requestAnswer(lastUser, 'follow_up')}>Explain more</button><button onClick={() => requestAnswer(lastUser, 'real_world_example')}>Show an example</button><button onClick={() => requestAnswer(`Compare ${lastUser} with a related concept.`, 'follow_up')}>Compare concepts</button><button onClick={() => { setQuizTopic(lastUser.slice(0, 120)); setQuiz(null); setQuizScore(0); setQuizCount(0); setQuizFinished(false); setView('quiz'); }}>Test my knowledge</button><button onClick={() => requestAnswer(lastUser, 'exam_answer')}>Exam answer</button></div>}
          <form className="composer" onSubmit={event => { event.preventDefault(); sendQuestion(); }}><label className="sr-only" htmlFor="question">Ask a study question</label><textarea id="question" rows="1" placeholder="Ask anything about programming or your studies..." value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendQuestion(); } }} maxLength={4000}/><div className="composer-bottom"><span>Enter to send · Shift + Enter for a new line</span><button type="submit" disabled={!input.trim() || busy} aria-label="Send question"><Send size={16}/></button></div></form>
        </>}
        {view === 'quiz' && <section className="tool-panel"><div className="tool-heading"><span className="tool-icon orange"><ClipboardList size={20}/></span><p className="eyebrow">PRACTICE QUIZ</p><h1>Test what you <span>know.</span></h1><p>Choose a topic. Your Study Master will make five multiple-choice questions and explain each answer.</p></div>{quizFinished ? <div className="quiz-card final-score"><p className="quiz-topic">QUIZ COMPLETE</p><h2>Your score: {quizScore} / 5</h2><p>You answered {quizScore} question{quizScore===1?'':'s'} correctly.</p><button className="primary-button" onClick={()=>{setQuizFinished(false);setQuiz(null);setQuizCount(0);}}>Try another quiz</button></div> : !quiz && <form className="tool-form" onSubmit={event => { event.preventDefault(); runQuiz(); }}><label htmlFor="quiz-topic">What topic should we practise?</label><input id="quiz-topic" value={quizTopic} onChange={event => setQuizTopic(event.target.value)} maxLength={120} placeholder="e.g. SQL joins, recursion, computer networks"/><button className="primary-button" disabled={!quizTopic.trim() || busy}>{busy ? 'Making your question…' : 'Generate a question'} <Send size={15}/></button></form>}{quiz && <div className="quiz-card"><p className="quiz-topic">QUESTION {quizCount} OF 5 · {quiz.topic || quizTopic}</p><h2>{quiz.question}</h2><div className="quiz-options">{quiz.options.map((option,index)=><button key={option} disabled={quizResult !== null} className={quizChoice===index?'choice-selected':''} onClick={()=>setQuizChoice(index)}><span>{String.fromCharCode(65+index)}</span>{option}</button>)}</div>{quizResult === null ? <button className="primary-button" disabled={quizChoice===null} onClick={()=>{const correct=quizChoice===quiz.correct_index;setQuizResult(correct);if(correct)setQuizScore(score=>score+1);}}>{quizChoice===null?'Select an answer':'Check answer'}</button> : <div className={`quiz-feedback ${quizResult?'correct':'incorrect'}`}><strong>{quizResult?'That’s right!':'Not quite—keep practising.'}</strong><p><strong className="correct-answer">Correct answer: {quiz.options[quiz.correct_index]}</strong><br/>{quiz.explanation}</p><button disabled={busy} onClick={()=>{if(quizCount>=5){setQuizFinished(true);setQuiz(null);}else{setQuizCount(count=>count+1);runQuiz(true);}}}>{busy?'Making your question…':quizCount>=5?'See my score':'Next question'}</button></div>}</div>}{error&&<div className="error-card" role="alert"><div><strong>We hit a little snag</strong><p>{error}</p></div><button onClick={()=>runQuiz(quizCount>0)}><RotateCcw size={14}/> Try again</button></div>}</section>}
        {view === 'code' && <section className="tool-panel"><div className="tool-heading"><span className="tool-icon"><Code2 size={20}/></span><p className="eyebrow">CODE EXPLAINER</p><h1>Let’s make your <span>code click.</span></h1><p>Paste a snippet and ask a question. The AI will explain it; it won’t claim to run it.</p></div><form className="tool-form" onSubmit={event=>{event.preventDefault();runTool('code');}}><label htmlFor="code-input">Your code or question</label><textarea id="code-input" rows="9" maxLength={4000} value={code} onChange={event=>setCode(event.target.value)} placeholder={'Paste code here…\n\n# Optional: what is confusing you?'} /><button className="primary-button" disabled={!code.trim()||busy}>{busy?'Explaining…':'Explain my code'} <Send size={15}/></button></form></section>}
        {view === 'notes' && <section className="tool-panel"><div className="tool-heading"><span className="tool-icon orange"><FileText size={20}/></span><p className="eyebrow">NOTES SIMPLIFIER</p><h1>Make revision <span>easier.</span></h1><p>Paste your notes to get a simpler summary, key points, and definitions grounded in what you shared.</p></div><form className="tool-form" onSubmit={event=>{event.preventDefault();runTool('notes');}}><label htmlFor="notes-input">Your study notes (up to 4,000 characters)</label><textarea id="notes-input" rows="9" maxLength={4000} value={notes} onChange={event=>setNotes(event.target.value)} placeholder="Paste a section of your notes here…"/><button className="primary-button" disabled={!notes.trim()||busy}>{busy?'Simplifying…':'Simplify my notes'} <Send size={15}/></button></form></section>}
        {view === 'settings' && <section className="tool-panel settings-panel"><div className="tool-heading"><span className="tool-icon orange"><Settings size={20}/></span><p className="eyebrow">YOUR PREFERENCES</p><h1>Make Study Master <span>yours.</span></h1><p>Choose the learning style for this conversation and manage your browser-session history.</p></div><section className="settings-card"><h2>Learning style</h2><p>This changes the guidance for your next AI answer.</p><div className="settings-mode-list">{modes.map(({id,name,note,icon:Icon})=><button key={id} className={`settings-mode ${mode===id?'selected':''}`} aria-pressed={mode===id} onClick={()=>{setMode(id);updateActive(item=>({...item,mode:id}));}}><Icon size={18}/><span><strong>{name}</strong><small>{note}</small></span>{mode===id&&<Check size={16}/>}</button>)}</div></section><section className="settings-card privacy-card"><h2>Session history</h2><p>Your conversations are stored in this browser tab only. They are not permanent or synced across devices.</p><button className="secondary-button" onClick={()=>setConfirmClear(true)}><Trash2 size={15}/> Clear session history</button></section></section>}
        <footer className="disclaimer"><BookOpen size={13}/> A learning companion. Double-check important information.</footer>
      </section>
    </main>
    {confirmClear && <div className="dialog-backdrop" role="presentation"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="clear-title"><h2 id="clear-title">Clear this session’s history?</h2><p>This removes the conversations saved in this browser tab.</p><div><button onClick={()=>setConfirmClear(false)}>Cancel</button><button className="danger-button" onClick={clearHistory}>Clear history</button></div></section></div>}
  </div>;
}
