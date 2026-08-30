import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, BrainCircuit, Check, FileText, FlaskConical, Mic, RotateCcw, UserRound, Clock3, ShieldAlert, Send, BarChart3 } from 'lucide-react';
import { generateProfessorProfile } from './profile';
import { decideInterruption } from './controller';
import './styles.css';

const initial = { candidateMaterials: '', presentation: '', professorName: '', affiliation: '', researchDirection: '', homepage: '', papers: '', duration: 5, interruptionMode: 'kind' };

function App() {
  const [form, setForm] = useState(() => JSON.parse(sessionStorage.getItem('aiic-setup') || 'null') || initial);
  const [profile, setProfile] = useState(() => JSON.parse(sessionStorage.getItem('aiic-profile') || 'null'));
  const [stage, setStage] = useState(profile ? 'profile' : 'setup');
  const [seconds, setSeconds] = useState(Number(form.duration) * 60);
  const [transcript, setTranscript] = useState('');
  const [segments, setSegments] = useState([]);
  const [interruption, setInterruption] = useState(null);
  const [interruptions, setInterruptions] = useState([]);
  const [qaIndex, setQaIndex] = useState(0);
  const [qaAnswer, setQaAnswer] = useState('');
  const [qaLog, setQaLog] = useState([]);
  const [report, setReport] = useState(null);
  const [voiceStatus, setVoiceStatus] = useState('idle');
  const [error, setError] = useState('');
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const generate = (event) => {
    event.preventDefault();
    if (!form.candidateMaterials.trim() || !form.professorName.trim() || !form.researchDirection.trim()) {
      setError('请至少填写候选人材料、教授姓名和研究方向。'); return;
    }
    const next = generateProfessorProfile(form);
    setProfile(next); setStage('profile'); setError(''); sessionStorage.setItem('aiic-setup', JSON.stringify(form)); sessionStorage.setItem('aiic-profile', JSON.stringify(next));
  };
  React.useEffect(() => { if (stage !== 'presenting') return; const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000); return () => clearInterval(id); }, [stage]);
  const startPresentation = () => { setSeconds(Number(form.duration) * 60); setSegments([]); setTranscript(''); setInterruption(null); setStage('presenting'); };
  const submitSegment = () => {
    const text = transcript.trim(); if (!text) return;
    const lower = text.toLowerCase(); const topic = profile.agenda[Math.min(segments.length, profile.agenda.length - 1)];
    const decision = decideInterruption({ text, interests: profile.professor_profile.research_interests, secondsLeft: seconds, totalSeconds: Number(form.duration) * 60, segmentCount: segments.length, maxFollowups: topic?.max_followups, mode: form.interruptionMode, interruptionCount: interruptions.length, lastInterruptionAt: interruptions.at(-1)?.at ?? null });
    const reason = decision.reason; const question = decision.question;
    const entry = { text, at: seconds, speaker: 'candidate' }; setSegments((s) => [...s, entry]); setTranscript('');
    if (reason) { const item = { reason, question, at: seconds }; setInterruption(item); setInterruptions((s) => [...s, item]); setStage('interrupted'); }
  };
  const answerInterruption = (e) => { e.preventDefault(); if (!qaAnswer.trim()) return; setSegments((s) => [...s, { text: qaAnswer.trim(), at: seconds, speaker: 'candidate', interruption: true }]); setQaAnswer(''); setInterruption(null); setStage('presenting'); };
  const endPresentation = () => { setStage('qa'); setQaIndex(0); setSeconds(0); };
  const currentQuestion = profile?.agenda?.[qaIndex]?.questions?.[qaLog.filter((x) => x.topic === profile?.agenda?.[qaIndex]?.topic).length || 0] || profile?.agenda?.[qaIndex]?.questions?.[0] || '你希望在研究生阶段继续探索什么问题？';
  const submitAnswer = (e) => { e.preventDefault(); if (!qaAnswer.trim()) return; const nextLog = [...qaLog, { topic: profile.agenda[qaIndex].topic, question: currentQuestion, answer: qaAnswer.trim() }]; setQaLog(nextLog); setQaAnswer(''); if (qaIndex + 1 >= Math.min(3, profile.agenda.length)) { const score = Math.max(35, 82 - interruptions.length * 7 - Math.max(0, 60 - seconds)); const next = { recovery: score, interruptionCount: interruptions.length, interruptionDuration: interruptions.length * 12, resumeDelay: interruptions.length * 6, qaLog: nextLog, duration: Number(form.duration) * 60 - seconds }; setReport(next); sessionStorage.setItem('aiic-report', JSON.stringify(next)); setStage('report'); } else setQaIndex((i) => i + 1); };
  const reset = () => { setStage('setup'); setProfile(null); setReport(null); setForm(initial); sessionStorage.clear(); };
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  if (stage === 'presenting' || stage === 'interrupted') return <Presentation clock={clock} profile={profile} segments={segments} interruption={interruption} transcript={transcript} setTranscript={setTranscript} submitSegment={submitSegment} qaAnswer={qaAnswer} setQaAnswer={setQaAnswer} answerInterruption={answerInterruption} endPresentation={endPresentation} voiceStatus={voiceStatus} setVoiceStatus={setVoiceStatus} />;
  if (stage === 'qa') return <QA profile={profile} index={qaIndex} question={currentQuestion} answer={qaAnswer} setAnswer={setQaAnswer} submit={submitAnswer} />;
  if (stage === 'report') return <Report profile={profile} report={report} reset={reset} />;
  return <main className="shell">
    <header className="topbar"><div className="brand"><BrainCircuit size={20}/> <span>ORAL EXAM / AIIC</span></div><span className="step">MVP · SETUP</span></header>
    <section className="intro"><p className="eyebrow">PROFESSOR INTERVIEW SIMULATOR</p><h1>练习被真正的导师打断。</h1><p className="sub">把目标教授的研究兴趣、你的真实经历和一场有节奏的复试放在同一个房间里。</p></section>
    <div className="workspace">
      <form className="setup panel" onSubmit={generate}>
        <div className="panel-title"><span>01</span><div><h2>Interview setup</h2><p>先给教授足够具体的材料。</p></div></div>
        <label><span><FileText size={15}/> Candidate materials <em>必填</em></span><textarea value={form.candidateMaterials} onChange={update('candidateMaterials')} placeholder="粘贴简历、科研项目或自我介绍文本…" rows="6" /></label>
        <label><span><FileText size={15}/> PPT / personal statement <small>可选</small></span><textarea value={form.presentation} onChange={update('presentation')} placeholder="粘贴你的复试 PPT 讲稿或个人陈述…" rows="3" /></label>
        <div className="section-rule" />
        <div className="panel-title compact"><span>02</span><div><h2>Target professor</h2><p>画像只服务于这一位教授。</p></div></div>
        <div className="grid"><label><span><UserRound size={15}/> Professor name <em>必填</em></span><input value={form.professorName} onChange={update('professorName')} placeholder="例如：王教授" /></label><label><span><FlaskConical size={15}/> School / lab</span><input value={form.affiliation} onChange={update('affiliation')} placeholder="例如：北京大学 · AI Lab" /></label></div>
        <label><span>Research direction <em>必填</em></span><input value={form.researchDirection} onChange={update('researchDirection')} placeholder="例如：多智能体系统、强化学习" /></label>
        <label><span>Homepage / introduction <small>可选</small></span><textarea value={form.homepage} onChange={update('homepage')} placeholder="粘贴教授主页或个人介绍…" rows="3" /></label>
        <label><span>Representative papers <small>可选</small></span><input value={form.papers} onChange={update('papers')} placeholder="论文标题，用逗号分隔" /></label>
        <div className="duration"><label><span>Presentation duration</span><select value={form.duration} onChange={update('duration')}><option value="5">5 minutes</option><option value="3">3 minutes</option><option value="8">8 minutes</option></select></label><label><span>Interview intensity</span><select value={form.interruptionMode} onChange={update('interruptionMode')}><option value="none">静默观察 · 不主动打断</option><option value="kind">标准追问 · 约 2 次</option><option value="pressure">高压追问 · 最多 4 次</option></select></label><button type="submit">Generate Professor <ArrowRight size={17}/></button></div>
        {error && <p className="error">{error}</p>}
      </form>
      <aside className="profile panel">{profile ? <><div className="profile-head"><div className="avatar">{profile.professor_profile.name.slice(0, 1)}</div><div><p className="eyebrow">SIMULATED PROFESSOR</p><h2>{profile.professor_profile.name}</h2><p>{profile.professor_profile.affiliation}</p></div><span className="ready"><Check size={14}/> READY</span></div><div className="profile-block"><h3>研究兴趣</h3><div className="chips">{profile.professor_profile.research_interests.map((x) => <span key={x}>{x}</span>)}</div></div><div className="profile-block"><h3>可能重点关注</h3><ul>{profile.professor_profile.focus.map((x) => <li key={x}>{x}</li>)}</ul></div><div className="profile-block"><h3>交叉点 / 可能追问</h3>{profile.intersections.map((x) => <p className="cross" key={x}>{x}</p>)}</div><div className="profile-note"><span>教授风格</span><p>{profile.professor_profile.style}</p></div><button className="primary-wide" onClick={startPresentation}><Mic size={16}/> Start {form.duration}-minute presentation <ArrowRight size={16}/></button><button className="secondary" onClick={() => { setProfile(null); setStage('setup'); sessionStorage.removeItem('aiic-profile'); }}><RotateCcw size={15}/> Edit setup</button></> : <div className="empty"><BrainCircuit size={30}/><h2>Your professor is waiting.</h2><p>完成左侧 setup 后，这里会生成一位有研究 agenda 的模拟教授。</p></div>}</aside>
    </div>
  </main>;
}
function Presentation({ clock, profile, segments, interruption, transcript, setTranscript, submitSegment, qaAnswer, setQaAnswer, answerInterruption, endPresentation, voiceStatus, setVoiceStatus }) { const listen = () => { const API = window.SpeechRecognition || window.webkitSpeechRecognition; if (!API) { setVoiceStatus('unsupported'); return; } const recognition = new API(); recognition.lang = 'zh-CN'; recognition.interimResults = false; recognition.onstart = () => setVoiceStatus('listening'); recognition.onerror = () => setVoiceStatus('error'); recognition.onend = () => setVoiceStatus('idle'); recognition.onresult = (e) => setTranscript((v) => `${v} ${e.results[0][0].transcript}`.trim()); recognition.start(); }; return <main className="sim-shell"><header className="sim-top"><div className="brand"><BrainCircuit size={20}/> ORAL EXAM / AIIC</div><span className="live"><span/> LIVE SIMULATION</span></header><section className="sim-hero"><p className="eyebrow">PRESENTATION SIMULATION</p><div className="sim-meta"><div><div className="avatar large">{profile.professor_profile.name.slice(0,1)}</div><h1>{profile.professor_profile.name}</h1><p>{profile.professor_profile.affiliation}</p></div><div className="timer"><Clock3 size={20}/><strong>{clock}</strong><span>remaining</span></div></div></section><div className="sim-grid"><section className="transcript panel"><div className="sim-label"><span>CANDIDATE TRANSCRIPT</span><small>{segments.length} segments</small></div>{segments.length ? segments.map((s,i)=><div className={s.interruption ? 'utterance marked':'utterance'} key={i}><span>{s.interruption ? 'AFTER INTERRUPTION':'YOU'}</span><p>{s.text}</p></div>) : <div className="transcript-empty">开始讲述你的个人陈述。每 10–20 秒提交一个自然语义段。</div>}<textarea value={transcript} onChange={(e)=>setTranscript(e.target.value)} placeholder="输入你正在讲的这一段…" rows="4" /><div className="input-actions"><span><ShieldAlert size={14}/> Controller 会检查内容并决定是否打断</span><span className="input-buttons"><button className="voice" onClick={listen}><Mic size={15}/> {voiceStatus === 'listening' ? 'Listening…' : 'Voice'}</button><button onClick={submitSegment}><Send size={15}/> Submit segment</button></span></div>{voiceStatus === 'unsupported' && <p className="voice-hint">当前浏览器不支持语音识别，请继续使用文字输入。</p>}{voiceStatus === 'error' && <p className="voice-hint">麦克风或语音权限不可用，文字输入仍可继续。</p>}<button className="finish" onClick={endPresentation}>Finish presentation <ArrowRight size={15}/></button></section><aside className={interruption ? 'interrupt panel active':'interrupt panel'}><div className="sim-label"><span>PROFESSOR INTERRUPTION</span><small>{interruption ? interruption.reason : 'LISTENING'}</small></div>{interruption ? <><div className="quote">“{interruption.question}”</div><p className="interrupt-note">计时没有暂停。回答后，你需要自己决定从哪里继续。</p><form onSubmit={answerInterruption}><textarea value={qaAnswer} onChange={(e)=>setQaAnswer(e.target.value)} placeholder="用文字回答教授…" rows="5" /><button><Send size={15}/> Answer & resume</button></form></> : <div className="listening"><span className="pulse"/><strong>Candidate is presenting…</strong><p>教授会根据研究兴趣、证据密度和时间主动介入。</p></div>}</aside></div></main> }
function QA({ profile, index, question, answer, setAnswer, submit }) { return <main className="qa-shell"><header className="topbar"><div className="brand"><BrainCircuit size={20}/> ORAL EXAM / AIIC</div><span className="step">FORMAL INTERVIEW · {index + 1}/3</span></header><div className="qa-wrap"><p className="eyebrow">PROFESSOR INTERVIEW</p><h1>现在，聊聊你的研究。</h1><div className="qa-card panel"><div className="profile-head"><div className="avatar">{profile.professor_profile.name.slice(0,1)}</div><div><h2>{profile.professor_profile.name}</h2><p>{profile.professor_profile.affiliation}</p></div></div><div className="question">{question}</div><form onSubmit={submit}><textarea value={answer} onChange={(e)=>setAnswer(e.target.value)} placeholder="用 1–2 分钟回答，教授会控制追问节奏…" rows="7" /><button>Submit answer <ArrowRight size={16}/></button></form></div></div></main> }
function Report({ profile, report, reset }) { return <main className="report-shell"><header className="topbar"><div className="brand"><BrainCircuit size={20}/> ORAL EXAM / AIIC</div><span className="step">SESSION REPORT</span></header><div className="report-wrap"><p className="eyebrow">POST-INTERVIEW DEBRIEF</p><h1>这位教授听到了什么？</h1><p className="sub">{profile.professor_profile.name} · {profile.professor_profile.affiliation}</p><div className="score-grid"><div className="score panel"><span>INTERRUPTION RECOVERY</span><strong>{report.recovery}<small>/100</small></strong><p>{report.interruptionCount ? `你被打断 ${report.interruptionCount} 次。每次打断后都重新获得了发言权。` : '本轮没有触发打断，保持了稳定节奏。'}</p></div><div className="metric panel"><BarChart3 size={18}/><strong>{report.duration}s</strong><span>presentation time recorded</span></div><div className="metric panel"><ShieldAlert size={18}/><strong>{report.interruptionCount}</strong><span>professor interruptions</span></div></div><section className="evidence panel"><h2>下一轮要练什么</h2><div className="advice"><b>01</b><p>被追问时先承认范围，再给结论：不要从背景重新开始。</p></div><div className="advice"><b>02</b><p>把“明显提升”“参与项目”替换成数字和明确的个人负责边界。</p></div><div className="advice"><b>03</b><p>教授已经覆盖一个 topic 后，主动用一句话切到下一个核心贡献。</p></div></section><button className="primary-wide" onClick={reset}><RotateCcw size={16}/> Start another round</button></div></main> }
createRoot(document.getElementById('root')).render(<App />);
