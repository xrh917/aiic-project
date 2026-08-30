import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, BrainCircuit, Check, FileText, FlaskConical, RotateCcw, UserRound } from 'lucide-react';
import { generateProfessorProfile } from './profile';
import './styles.css';

const initial = { candidateMaterials: '', presentation: '', professorName: '', affiliation: '', researchDirection: '', homepage: '', papers: '', duration: 5 };

function App() {
  const [form, setForm] = useState(() => JSON.parse(sessionStorage.getItem('aiic-setup') || 'null') || initial);
  const [profile, setProfile] = useState(() => JSON.parse(sessionStorage.getItem('aiic-profile') || 'null'));
  const [error, setError] = useState('');
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const generate = (event) => {
    event.preventDefault();
    if (!form.candidateMaterials.trim() || !form.professorName.trim() || !form.researchDirection.trim()) {
      setError('请至少填写候选人材料、教授姓名和研究方向。'); return;
    }
    const next = generateProfessorProfile(form);
    setProfile(next); setError(''); sessionStorage.setItem('aiic-setup', JSON.stringify(form)); sessionStorage.setItem('aiic-profile', JSON.stringify(next));
  };
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
        <div className="duration"><label><span>Presentation duration</span><select value={form.duration} onChange={update('duration')}><option value="5">5 minutes</option><option value="3">3 minutes</option><option value="8">8 minutes</option></select></label><button type="submit">Generate Professor <ArrowRight size={17}/></button></div>
        {error && <p className="error">{error}</p>}
      </form>
      <aside className="profile panel">{profile ? <><div className="profile-head"><div className="avatar">{profile.professor_profile.name.slice(0, 1)}</div><div><p className="eyebrow">SIMULATED PROFESSOR</p><h2>{profile.professor_profile.name}</h2><p>{profile.professor_profile.affiliation}</p></div><span className="ready"><Check size={14}/> READY</span></div><div className="profile-block"><h3>研究兴趣</h3><div className="chips">{profile.professor_profile.research_interests.map((x) => <span key={x}>{x}</span>)}</div></div><div className="profile-block"><h3>可能重点关注</h3><ul>{profile.professor_profile.focus.map((x) => <li key={x}>{x}</li>)}</ul></div><div className="profile-block"><h3>交叉点 / 可能追问</h3>{profile.intersections.map((x) => <p className="cross" key={x}>{x}</p>)}</div><div className="profile-note"><span>教授风格</span><p>{profile.professor_profile.style}</p></div><button className="secondary" onClick={() => { setProfile(null); sessionStorage.removeItem('aiic-profile'); }}><RotateCcw size={15}/> Edit setup</button></> : <div className="empty"><BrainCircuit size={30}/><h2>Your professor is waiting.</h2><p>完成左侧 setup 后，这里会生成一位有研究 agenda 的模拟教授。</p></div>}</aside>
    </div>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
