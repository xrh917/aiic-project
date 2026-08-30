import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  BrainCircuit,
  Check,
  FileText,
  FlaskConical,
  Mic,
  RotateCcw,
  UserRound,
  Clock3,
  ShieldAlert,
  Send,
  BarChart3,
} from "lucide-react";
import { generateProfessorProfile } from "./profile";
import { decideInterruption } from "./controller";
import { generateProfessorProfileAI, decideInterruptionAI, generateQuestionsAI, generateReportAI } from "./ai";
import { calculateRecoveryScore } from "./scoring";
import { analyzeEvidence } from "./feedback";
import "./styles.css";

class AppErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error("AIIC render error:", error); }
  render() {
    if (!this.state.error) return this.props.children;
    return <main className="shell"><section className="panel error-screen"><h1>页面遇到一个暂时错误</h1><p>你的面试材料仍保存在当前会话中。刷新页面后可以继续。</p><button className="primary-wide" onClick={() => window.location.reload()}>刷新页面</button></section></main>;
  }
}

const initial = {
  candidateMaterials: "",
  presentation: "",
  professorName: "",
  affiliation: "",
  researchDirection: "",
  homepage: "",
  papers: "",
  duration: 5,
  interruptionMode: "kind",
  interviewMode: "presentation-only",
};

const modeLabels = { none: "静默观察", kind: "标准追问", pressure: "高压追问" };

function App() {
  const [form, setForm] = useState(
    () => JSON.parse(sessionStorage.getItem("aiic-setup") || "null") || initial,
  );
  const [profile, setProfile] = useState(() =>
    JSON.parse(sessionStorage.getItem("aiic-profile") || "null"),
  );
  const [stage, setStage] = useState(profile ? "profile" : "setup");
  const [seconds, setSeconds] = useState(Number(form.duration) * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [segments, setSegments] = useState([]);
  const [interruption, setInterruption] = useState(null);
  const [interruptions, setInterruptions] = useState([]);
  const [qaIndex, setQaIndex] = useState(0);
  const [qaAnswer, setQaAnswer] = useState("");
  const [qaLog, setQaLog] = useState([]);
  const [report, setReport] = useState(null);
  const [runHistory, setRunHistory] = useState(() => JSON.parse(sessionStorage.getItem("aiic-runs") || "[]"));
  const [voiceStatus, setVoiceStatus] = useState("idle");
  const [interruptionVoiceStatus, setInterruptionVoiceStatus] = useState("idle");
  const [error, setError] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  const generate = async (event) => {
    event.preventDefault();
    if (
      !form.candidateMaterials.trim() ||
      !form.professorName.trim() ||
      !form.researchDirection.trim()
    ) {
      setError("请至少填写候选人材料、教授姓名和研究方向。");
      return;
    }
    setAiBusy(true);
    const next = await generateProfessorProfileAI(form);
    setProfile(next);
    setStage("profile");
    setError("");
    sessionStorage.setItem("aiic-setup", JSON.stringify(form));
    sessionStorage.setItem("aiic-profile", JSON.stringify(next));
    setAiBusy(false);
  };
  const fillDemo = () =>
    setForm({
      ...initial,
      candidateMaterials:
        "我和两位同学完成了一个用最优控制做语言模型预训练数据筛选的复现项目。我个人负责数据选择器、costate 近似训练循环、数据来源分层和消融实验。我们使用 1.2 亿 token 语料和 125M decoder-only Transformer，比较 Uniform、Perplexity、Gradient-norm 与 PDS。PDS 将达到相同验证损失所需 token 从 100M 降到 76M，验证集 loss 为 3.02；但选择器需要额外计算，且小模型结果不能直接推广到 400B 模型。我还复现了在线 pairwise learning-to-rank 原型，发现 uncertainty-only exploration 在点击偏差强时会过早相信错误排序。",
      presentation:
        "各位老师好，我是陈同学，本科读计算机科学与技术。平时我比较喜欢机器学习里需要做判断的问题，比如数据怎么选、什么时候应该继续探索。今天我想重点介绍一个三人小组的复现项目，主题是语言模型预训练时的数据选择。我们用一个 125M 的小模型比较了随机抽样、perplexity、gradient-norm 和 PDS。PDS 达到同一个验证损失时大约用了 76M token，随机抽样大约是 100M。不过我不想把它直接说成节省了真实算力，因为选择器本身也要额外计算。我主要负责选择器、近似 costate 更新、数据分层和实验，中间还排查过选择器偏爱短文本的问题。这个结果目前只能说明小规模设置下的趋势，下一步我会把选择开销和训练开销放进同一个 FLOPs 目标里。我的介绍到这里，谢谢老师。",
      professorName: "周教授（脱敏画像）",
      affiliation: "华北某重点大学 · 决策智能与交互学习实验室",
      researchDirection:
        "机器学习、信息检索、序列决策、在线学习、语言模型 agent、可信推荐系统",
      homepage:
        "长期研究机器学习与信息检索交叉问题，关注序列决策和在线反馈，面试重视 baseline、实验公平、个人贡献和结论边界。",
      papers:
        "通过最优控制进行语言模型数据选择；通过分治进行在线成对排序学习；面向序列决策的用户反馈建模",
      duration: 5,
      interruptionMode: "kind",
    });
  React.useEffect(() => {
    if (stage !== "presenting") return;
    const id = setInterval(() => {
      setElapsedSeconds((value) => value + 1);
      setSeconds((value) => value - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [stage]);
  const startPresentation = () => {
    setSeconds(Number(form.duration) * 60);
    setElapsedSeconds(0);
    setSegments([]);
    setTranscript("");
    setInterruption(null);
    setStage("presenting");
  };
  const submitSegment = async (textOverride) => {
    const text = (textOverride ?? transcript).trim();
    if (!text) return;
    const topic =
      profile.agenda[Math.min(segments.length, profile.agenda.length - 1)];
    const history = segments.slice(-6);
    const topicSegments = segments.filter((segment) =>
      topic?.candidate_evidence && segment.text.toLowerCase().includes(String(topic.candidate_evidence).slice(0, 24).toLowerCase()),
    );
    const fullText = [...segments.map((segment) => segment.text), text].join(" ");
    setAiBusy(true);
    const decision = await decideInterruptionAI({
      text,
      interests: profile.professor_profile.research_interests,
      secondsLeft: seconds,
      totalSeconds: Number(form.duration) * 60,
      segmentCount: segments.length,
      maxFollowups: topic?.max_followups,
      mode: form.interruptionMode,
      interruptionCount: interruptions.length,
      lastInterruptionAt: interruptions.at(-1)?.at ?? null,
      topic: topic?.topic,
      history,
      priorInterruptions: interruptions,
      topicCoverage: topicSegments.length ? `已有 ${topicSegments.length} 段与当前议题相关的内容` : "尚未形成明确覆盖",
      hasLaterEvidence: /\d|我负责|我的主要工作|具体|基线|对照/.test(fullText),
    });
    setAiBusy(false);
    const reason = decision.reason;
    const question = decision.question;
    const entry = { text, at: seconds, speaker: "candidate" };
    setSegments((s) => [...s, entry]);
    setTranscript("");
    if (reason) {
      const item = { reason, question, at: seconds };
      setInterruption(item);
      setInterruptions((s) => [...s, item]);
      setStage("interrupted");
    }
  };
  const answerInterruption = (e) => {
    e.preventDefault();
    if (!qaAnswer.trim()) return;
    setSegments((s) => [
      ...s,
      {
        text: qaAnswer.trim(),
        at: seconds,
        speaker: "candidate",
        interruption: true,
      },
    ]);
    setQaAnswer("");
    setInterruption(null);
    setStage("presenting");
  };
  const finishReport = async (answerLog = qaLog) => {
    const elapsed = Number(form.duration) * 60 - seconds;
    const resumeDelay = interruptions.length * 6;
    const score = calculateRecoveryScore({
      interruptionCount: interruptions.length,
      resumeDelay,
      elapsedSeconds: elapsed,
      totalSeconds: Number(form.duration) * 60,
    });
    const fallback = {
      recovery: score,
      interruptionCount: interruptions.length,
      interruptionDuration: interruptions.length * 12,
      resumeDelay,
      qaLog: answerLog,
      evidence: analyzeEvidence(segments, answerLog),
      duration: elapsed,
      overallImpression: "本轮记录已完成，建议结合下方证据复盘表达和科研回答。",
      strengths: ["完成了完整的个人陈述", interruptions.length ? "在教授打断后继续完成了陈述" : "保持了连续的陈述节奏"],
      dimensions: [
        { name: "科研理解", score: 3, evidence: "证据不足", observation: "需要更多完整回答才能判断。", impact: "教授难以确认理解深度。" },
        { name: "个人贡献", score: 3, evidence: "证据不足", observation: "需要明确说明亲自完成的工作。", impact: "个人能力边界不够清晰。" },
        { name: "证据与严谨性", score: 3, evidence: "证据不足", observation: "需要用关键数字和对照支撑结论。", impact: "结论可信度有限。" },
        { name: "方法取舍与研究思维", score: 3, evidence: "证据不足", observation: "需要说明替代方案和失败边界。", impact: "研究判断力仍需更多证据。" },
        { name: "表达结构", score: 3, evidence: "证据不足", observation: "需要结合完整录音或文字判断。", impact: "暂不能判断表达效率。" },
        { name: "打断恢复", score: score ? Math.round(score / 20) : 3, evidence: "面试过程记录", observation: "根据打断次数和恢复耗时估计。", impact: "反映临场调整能力。" },
      ],
      priorityImprovements: [],
    };
    setAiBusy(true);
    const next = await generateReportAI({ profile, segments, qaLog: answerLog, fallback });
    setAiBusy(false);
    setReport(next);
    sessionStorage.setItem("aiic-report", JSON.stringify(next));
    const run = {
      id: Date.now(),
      mode: form.interruptionMode,
      modeLabel: modeLabels[form.interruptionMode] || form.interruptionMode,
      recovery: next.recovery,
      interruptionCount: next.interruptionCount,
      duration: next.duration,
    };
    setRunHistory((history) => {
      const nextHistory = [...history, run].slice(-3);
      sessionStorage.setItem("aiic-runs", JSON.stringify(nextHistory));
      return nextHistory;
    });
    setStage("report");
  };
  const endPresentation = async () => {
    if (form.interviewMode === "deep-qa") {
      setStage("qa");
      setQaIndex(0);
      if (profile && !profile.aiQuestions) {
        const questions = await generateQuestionsAI(profile);
        const next = { ...profile, aiQuestions: questions };
        setProfile(next);
        sessionStorage.setItem("aiic-profile", JSON.stringify(next));
      }
      return;
    }
    await finishReport([]);
  };
  const currentQuestion =
    profile?.aiQuestions?.[qaIndex] || profile?.agenda?.[qaIndex]?.questions?.[
      qaLog.filter((x) => x.topic === profile?.agenda?.[qaIndex]?.topic)
        .length || 0
    ] ||
    profile?.agenda?.[qaIndex]?.questions?.[0] ||
    "你希望在研究生阶段继续探索什么问题？";
  const submitAnswer = async (e) => {
    e.preventDefault();
    if (!qaAnswer.trim()) return;
    const nextLog = [
      ...qaLog,
      {
        topic: profile.agenda[qaIndex].topic,
        question: currentQuestion,
        answer: qaAnswer.trim(),
      },
    ];
    setQaLog(nextLog);
    setQaAnswer("");
    if (qaIndex + 1 >= Math.min(3, profile.agenda.length)) {
      await finishReport(nextLog);
    } else setQaIndex((i) => i + 1);
  };
  const reset = () => {
    setStage("setup");
    setProfile(null);
    setReport(null);
    setSegments([]);
    setInterruptions([]);
    setQaLog([]);
    setQaAnswer("");
    setInterruption(null);
    sessionStorage.removeItem("aiic-profile");
    sessionStorage.removeItem("aiic-report");
  };
  const clock = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`;
  if (stage === "presenting" || stage === "interrupted")
    return (
      <Presentation
        elapsed={clock}
        overLimit={elapsedSeconds >= Number(form.duration) * 60}
        nearLimit={
          elapsedSeconds >= Number(form.duration) * 60 - 30 &&
          elapsedSeconds < Number(form.duration) * 60
        }
        profile={profile}
        segments={segments}
        interruption={interruption}
        transcript={transcript}
        setTranscript={setTranscript}
        submitSegment={submitSegment}
        qaAnswer={qaAnswer}
        setQaAnswer={setQaAnswer}
        answerInterruption={answerInterruption}
        endPresentation={endPresentation}
        voiceStatus={voiceStatus}
        setVoiceStatus={setVoiceStatus}
        interruptionVoiceStatus={interruptionVoiceStatus}
        setInterruptionVoiceStatus={setInterruptionVoiceStatus}
      />
    );
  if (stage === "qa")
    return (
      <QA
        profile={profile}
        index={qaIndex}
        question={currentQuestion}
        answer={qaAnswer}
        setAnswer={setQaAnswer}
        submit={submitAnswer}
      />
    );
  if (stage === "report")
    return <Report profile={profile} report={report} reset={reset} runHistory={runHistory} />;
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <BrainCircuit size={20} /> <span>ORAL EXAM / AIIC</span>
        </div>
        <span className="step">MVP · SETUP</span>
      </header>
      <section className="intro">
        <p className="eyebrow">PROFESSOR INTERVIEW SIMULATOR</p>
        <h1>准备一场真正的导师复试。</h1>
        <p className="sub">
          提供你的材料，指定目标教授，开始一场会主动追问和控制节奏的模拟面试。
        </p>
      </section>
      <div className="setup-progress">
        <span className="active">
          <b>01</b>你的材料
        </span>
        <i />
        <span>
          <b>02</b>目标教授
        </span>
        <i />
        <span>
          <b>03</b>面试策略
        </span>
      </div>
      <div className="workspace">
        <form className="setup panel" onSubmit={generate}>
          <div className="panel-title">
            <span>01</span>
            <div>
              <h2>你的材料</h2>
              <p>教授会从你的真实经历中找到追问入口。</p>
            </div>
            <button type="button" className="demo-fill" onClick={fillDemo}>
              使用演示材料
            </button>
          </div>
          <label>
            <span>
              <FileText size={15} /> 简历 / 科研经历 <em>必填</em>
            </span>
            <textarea
              className="primary-input"
              value={form.candidateMaterials}
              onChange={update("candidateMaterials")}
              placeholder="粘贴简历、科研项目或自我介绍文本…"
              rows="8"
            />
          </label>
          <label>
            <span>
              <FileText size={15} /> PPT / 个人陈述 <small>可选</small>
            </span>
            <textarea
              value={form.presentation}
              onChange={update("presentation")}
              placeholder="粘贴你的复试 PPT 讲稿或个人陈述…"
              rows="3"
            />
          </label>
          <div className="section-rule" />
          <div className="panel-title compact">
            <span>02</span>
            <div>
              <h2>目标教授</h2>
              <p>画像只服务于这一位教授。</p>
            </div>
          </div>
          <div className="grid">
            <label>
              <span>
                <UserRound size={15} /> 教授姓名 <em>必填</em>
              </span>
              <input
                value={form.professorName}
                onChange={update("professorName")}
                placeholder="例如：王教授"
              />
            </label>
            <label>
              <span>
                <FlaskConical size={15} /> 学校 / 实验室
              </span>
              <input
                value={form.affiliation}
                onChange={update("affiliation")}
                placeholder="例如：北京大学 · AI Lab"
              />
            </label>
          </div>
          <label>
            <span>
              研究方向 <em>必填</em>
            </span>
            <input
              value={form.researchDirection}
              onChange={update("researchDirection")}
              placeholder="例如：多智能体系统、强化学习"
            />
          </label>
          <details className="optional-details">
            <summary>
              补充教授信息 <small>主页介绍 / 代表论文</small>
            </summary>
            <label>
              <span>教授主页 / 个人介绍</span>
              <textarea
                value={form.homepage}
                onChange={update("homepage")}
                placeholder="粘贴教授主页或个人介绍…"
                rows="3"
              />
            </label>
            <label>
              <span>代表论文</span>
              <input
                value={form.papers}
                onChange={update("papers")}
                placeholder="论文标题，用逗号分隔"
              />
            </label>
          </details>
          <div className="strategy-head">
            <span>03</span>
            <div>
              <h2>面试策略</h2>
              <p>选择教授介入陈述的强度。</p>
            </div>
          </div>
          <div className="mode-cards">
            {[
              ["none", "静默观察", "不主动打断，先专注完成陈述"],
              ["kind", "标准追问", "只在关键研究点介入，约 2 次"],
              ["pressure", "高压追问", "更积极挑战方法与证据，最多 4 次"],
            ].map(([value, title, desc]) => (
              <button
                type="button"
                key={value}
                className={
                  form.interruptionMode === value
                    ? "mode-card selected"
                    : "mode-card"
                }
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    interruptionMode: value,
                  }))
                }
              >
                <strong>{title}</strong>
                <span>{desc}</span>
              </button>
            ))}
          </div>
          <div className="interview-mode">
            <div className="interview-mode-label">
              <span>面试环节</span>
              <small>陈述结束后是否继续正式问答</small>
            </div>
            <div className="mode-cards deep-mode-cards">
              {[
                ["presentation-only", "陈述评估", "结束陈述后直接生成带证据的反馈报告"],
                ["deep-qa", "陈述 + 深度问答", "结束陈述后进入最多 3 个结构化教授问题"],
              ].map(([value, title, desc]) => (
                <button
                  type="button"
                  key={value}
                  className={form.interviewMode === value ? "mode-card selected" : "mode-card"}
                  onClick={() => setForm((current) => ({ ...current, interviewMode: value }))}
                >
                  <strong>{title}</strong>
                  <span>{desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="duration">
            <label>
              <span>陈述建议时长</span>
              <select value={form.duration} onChange={update("duration")}>
                <option value="5">5 分钟</option>
                <option value="3">3 分钟</option>
                <option value="8">8 分钟</option>
              </select>
            </label>
            <button type="submit">
              {aiBusy ? "正在分析材料…" : "生成模拟教授"} <ArrowRight size={17} />
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </form>
        <aside className="profile panel">
          {profile ? (
            <>
              <div className="profile-head">
                <div className="avatar">
                  {profile.professor_profile.name.slice(0, 1)}
                </div>
                <div>
                  <p className="eyebrow">SIMULATED PROFESSOR</p>
                  <h2>{profile.professor_profile.name}</h2>
                  <p>{profile.professor_profile.affiliation}</p>
                </div>
                <span className="ready">
                  <Check size={14} /> READY
                </span>
              </div>
              <div className="profile-block">
                <h3>研究兴趣</h3>
                <div className="chips">
                  {profile.professor_profile.research_interests.map((x) => (
                    <span key={x}>{x}</span>
                  ))}
                </div>
              </div>
              <div className="profile-block">
                <h3>可能重点关注</h3>
                <ul>
                  {profile.professor_profile.focus.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div className="profile-block">
                <h3>交叉点 / 可能追问</h3>
                {profile.intersections.map((x) => (
                  <p className="cross" key={x}>
                    {x}
                  </p>
                ))}
              </div>
              <div className="profile-note">
                <span>教授风格</span>
                <p>{profile.professor_profile.style}</p>
              </div>
              <button className="primary-wide" onClick={startPresentation}>
                <Mic size={16} /> Start {form.duration}-minute presentation{" "}
                <ArrowRight size={16} />
              </button>
              <button
                className="secondary"
                onClick={() => {
                  setProfile(null);
                  setStage("setup");
                  sessionStorage.removeItem("aiic-profile");
                }}
              >
                <RotateCcw size={15} /> Edit setup
              </button>
            </>
          ) : (
            <div className="empty">
              <BrainCircuit size={30} />
              <h2>Your professor is waiting.</h2>
              <p>完成左侧 setup 后，这里会生成一位有研究 agenda 的模拟教授。</p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
function Presentation({
  elapsed,
  overLimit,
  nearLimit,
  profile,
  segments,
  interruption,
  transcript,
  setTranscript,
  submitSegment,
  qaAnswer,
  setQaAnswer,
  answerInterruption,
  endPresentation,
  voiceStatus,
  setVoiceStatus,
  interruptionVoiceStatus,
  setInterruptionVoiceStatus,
}) {
  return (
    <main className="sim-shell">
      <header className="sim-top">
        <div className="brand">
          <BrainCircuit size={20} /> ORAL EXAM / AIIC
        </div>
        <span className="live">
          <span /> LIVE SIMULATION
        </span>
      </header>
      <section className="sim-hero">
        <p className="eyebrow">PRESENTATION SIMULATION</p>
        <div className="sim-meta">
          <div>
            <div className="avatar large">
              {profile.professor_profile.name.slice(0, 1)}
            </div>
            <h1>{profile.professor_profile.name}</h1>
            <p>{profile.professor_profile.affiliation}</p>
          </div>
          <div className={overLimit ? "elapsed overtime" : "elapsed"}>
            <Clock3 size={17} />
            <strong>{elapsed}</strong>
            <span>{overLimit ? "over recommended limit" : "elapsed"}</span>
          </div>
        </div>
        {nearLimit && (
          <div className="time-notice">
            还剩约 30 秒，建议总结核心贡献并准备收尾。
          </div>
        )}
        {overLimit && (
          <div className="time-notice overtime-notice">
            已超过建议时长，你可以继续完成陈述；实际用时会记录在报告中。
          </div>
        )}
      </section>
      <div className="sim-grid">
        <section className="transcript panel">
          <div className="sim-label">
            <span>CANDIDATE TRANSCRIPT</span>
            <small>{segments.length} segments</small>
          </div>
          {segments.length ? (
            segments.map((s, i) => (
              <div
                className={s.interruption ? "utterance marked" : "utterance"}
                key={i}
              >
                <span>{s.interruption ? "AFTER INTERRUPTION" : "YOU"}</span>
                <p>{s.text}</p>
              </div>
            ))
          ) : (
            <div className="transcript-empty">
              开始讲述你的个人陈述。每 10–20 秒提交一个自然语义段。
            </div>
          )}
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="输入你正在讲的这一段…"
            rows="4"
          />
          <div className="input-actions">
            <span>
              <ShieldAlert size={14} /> Controller 会检查内容并决定是否打断
            </span>
            <span className="input-buttons">
              <VoiceButton
                voiceStatus={voiceStatus}
                setVoiceStatus={setVoiceStatus}
                setTranscript={setTranscript}
                onSegment={submitSegment}
              />
              <button type="button" onClick={() => submitSegment()}>
                <Send size={15} /> Submit segment
              </button>
            </span>
          </div>
          {voiceStatus === "listening" && (
            <p className="voice-ready" aria-live="polite">
              <span /> 可以开始说话
            </p>
          )}
          {voiceStatus === "reconnecting" && (
            <p className="voice-hint" aria-live="polite">
              正在重新连接语音识别…
            </p>
          )}
          {voiceStatus === "unsupported" && (
            <p className="voice-hint">
              当前浏览器不支持语音识别，请继续使用文字输入。
            </p>
          )}
          {voiceStatus === "error" && (
            <p className="voice-hint">
              麦克风或语音权限不可用，文字输入仍可继续。
            </p>
          )}
          {voiceStatus === "secure-required" && (
            <p className="voice-hint">
              语音输入需要 HTTPS 安全连接，请使用 https 地址并允许麦克风权限。
            </p>
          )}
          <button className="finish" onClick={endPresentation}>
            Finish presentation <ArrowRight size={15} />
          </button>
        </section>
        <aside
          className={
            interruption ? "interrupt panel active" : "interrupt panel"
          }
        >
          <div className="sim-label">
            <span>PROFESSOR INTERRUPTION</span>
            <small>{interruption ? interruption.reason : "LISTENING"}</small>
          </div>
          {interruption ? (
            <>
              <div className="quote">“{interruption.question}”</div>
              <p className="interrupt-note">
                计时没有暂停。回答后，你需要自己决定从哪里继续。
              </p>
              <form onSubmit={answerInterruption}>
                <textarea
                  value={qaAnswer}
                  onChange={(e) => setQaAnswer(e.target.value)}
                  placeholder="用文字回答教授…"
                  rows="5"
                />
                <div className="interrupt-actions">
                  <VoiceButton
                    voiceStatus={interruptionVoiceStatus}
                    setVoiceStatus={setInterruptionVoiceStatus}
                    setTranscript={setQaAnswer}
                    onSegment={(text) => setQaAnswer((value) => value ? `${value} ${text}` : text)}
                  />
                  <button><Send size={15} /> Answer & resume</button>
                </div>
                {interruptionVoiceStatus === "listening" && <p className="voice-ready" aria-live="polite"><span /> 可以开始说话</p>}
                {interruptionVoiceStatus === "unsupported" && <p className="voice-hint">当前浏览器不支持语音识别，请继续使用文字输入。</p>}
                {interruptionVoiceStatus === "secure-required" && <p className="voice-hint">语音输入需要 HTTPS 安全连接。</p>}
                {interruptionVoiceStatus === "error" && <p className="voice-hint">麦克风或语音权限不可用，文字输入仍可继续。</p>}
              </form>
            </>
          ) : (
            <div className="listening">
              <span className="pulse" />
              <strong>Candidate is presenting…</strong>
              <p>教授会根据研究兴趣、证据密度和时间主动介入。</p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
function QA({ profile, index, question, answer, setAnswer, submit }) {
  return (
    <main className="qa-shell">
      <header className="topbar">
        <div className="brand">
          <BrainCircuit size={20} /> ORAL EXAM / AIIC
        </div>
        <span className="step">FORMAL INTERVIEW · {index + 1}/3</span>
      </header>
      <div className="qa-wrap">
        <p className="eyebrow">PROFESSOR INTERVIEW</p>
        <h1>现在，聊聊你的研究。</h1>
        <div className="qa-card panel">
          <div className="profile-head">
            <div className="avatar">
              {profile.professor_profile.name.slice(0, 1)}
            </div>
            <div>
              <h2>{profile.professor_profile.name}</h2>
              <p>{profile.professor_profile.affiliation}</p>
            </div>
          </div>
          <div className="question">{question}</div>
          <form onSubmit={submit}>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="用 1–2 分钟回答，教授会控制追问节奏…"
              rows="7"
            />
            <button>
              Submit answer <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
function Report({ profile, report, reset, runHistory = [] }) {
  return (
    <main className="report-shell">
      <header className="topbar">
        <div className="brand">
          <BrainCircuit size={20} /> ORAL EXAM / AIIC
        </div>
        <span className="step">SESSION REPORT</span>
      </header>
      <div className="report-wrap">
        <p className="eyebrow">POST-INTERVIEW DEBRIEF</p>
        <h1>这位教授听到了什么？</h1>
        <p className="sub">
          {profile.professor_profile.name} ·{" "}
          {profile.professor_profile.affiliation}
        </p>
        {report.overallImpression && (
          <section className="overall panel">
            <h2>教授整体印象</h2>
            <p>{report.overallImpression}</p>
            {report.strengths?.length > 0 && (
              <div className="strengths"><b>做得好的地方</b><ul>{report.strengths.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
            )}
          </section>
        )}
        {report.dimensions?.length > 0 && (
          <section className="dimensions panel">
            <h2>能力维度评分</h2>
            <div className="dimension-list">
              {report.dimensions.map((item, index) => (
                <div className="dimension" key={`${item.name}-${index}`}>
                  <div className="dimension-head"><strong>{item.name}</strong><b>{item.score}/5</b></div>
                  <p>{item.observation}</p>
                  <small>依据：{item.evidence || "证据不足"}</small>
                </div>
              ))}
            </div>
          </section>
        )}
        <div className="score-grid">
          <div className="score panel">
            <span>INTERRUPTION RECOVERY</span>
            <strong>
              {report.recovery}
              <small>/100</small>
            </strong>
            <p>
              {report.interruptionCount
                ? `你被打断 ${report.interruptionCount} 次。每次打断后都重新获得了发言权。`
                : "本轮没有触发打断，保持了稳定节奏。"}
            </p>
          </div>
          <div className="metric panel">
            <BarChart3 size={18} />
            <strong>{report.duration}s</strong>
            <span>presentation time recorded</span>
          </div>
          <div className="metric panel">
            <ShieldAlert size={18} />
            <strong>{report.interruptionCount}</strong>
            <span>professor interruptions</span>
          </div>
        </div>
        {runHistory.length > 1 && (
          <section className="comparison panel">
            <div className="comparison-head"><h2>同一材料的模式对比</h2><small>最近 {runHistory.length} 轮</small></div>
            <div className="comparison-grid">
              {runHistory.map((run) => (
                <div className="comparison-run" key={run.id}>
                  <strong>{run.modeLabel}</strong>
                  <span>恢复 {run.recovery}/100</span>
                  <span>打断 {run.interruptionCount} 次 · {run.duration}s</span>
                </div>
              ))}
            </div>
            <p className="comparison-note">保持同一份材料，切换教授模式后重新开始，即可观察不同临场压力下的表现差异。</p>
          </section>
        )}
        <section className="evidence panel">
          <h2>最影响判断的问题</h2>
          {report.priorityImprovements?.length || report.evidence?.length ? (
            (report.priorityImprovements || report.evidence).map((item, index) => (
              <div className="finding" key={`${item.tag}-${index}`}>
                <div className="finding-top">
                  <b>{String(index + 1).padStart(2, "0")}</b>
                  <span>{item.category || item.tag || "证据反馈"}</span>
                </div>
                <blockquote>“{item.quote}”</blockquote>
                <p>
                  <strong>问题：</strong>
                  {item.issue}
                </p>
                {item.impact && <p><strong>影响：</strong>{item.impact}</p>}
                <p>
                  <strong>建议：</strong>
                  {item.advice}
                </p>
              </div>
            ))
          ) : (
            <p className="no-findings">
              本轮没有检测到明显的证据缺口，继续保持具体、可验证的表达。
            </p>
          )}
          <h2>下一轮要练什么</h2>
          <div className="advice">
            <b>01</b>
            <p>被追问时先承认范围，再给结论：不要从背景重新开始。</p>
          </div>
          <div className="advice">
            <b>02</b>
            <p>把“明显提升”“参与项目”替换成数字和明确的个人负责边界。</p>
          </div>
          <div className="advice">
            <b>03</b>
            <p>教授已经覆盖一个 topic 后，主动用一句话切到下一个核心贡献。</p>
          </div>
        </section>
        <button className="primary-wide" onClick={reset}>
          <RotateCcw size={16} /> Start another round
        </button>
      </div>
    </main>
  );
}
function VoiceButton({
  voiceStatus,
  setVoiceStatus,
  setTranscript,
  onSegment,
}) {
  const recognitionRef = useRef(null);
  const activeRef = useRef(false);
  const bufferRef = useRef("");
  const onSegmentRef = useRef(onSegment);
  onSegmentRef.current = onSegment;
  React.useEffect(() => {
    const id = window.setInterval(() => {
      if (!activeRef.current) return;
      const text = bufferRef.current.trim();
      if (!text) return;
      bufferRef.current = "";
      setTranscript("");
      onSegmentRef.current(text);
    }, 15000);
    return () => window.clearInterval(id);
  }, []);
  React.useEffect(() => () => {
    activeRef.current = false;
    recognitionRef.current?.stop();
  }, []);
  const toggle = () => {
    if (!window.isSecureContext) return setVoiceStatus("secure-required");
    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!API) return setVoiceStatus("unsupported");
    if (activeRef.current) {
      activeRef.current = false;
      recognitionRef.current?.stop();
      setVoiceStatus("idle");
      return;
    }
    const recognition = new API();
    recognitionRef.current = recognition;
    activeRef.current = true;
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setVoiceStatus("warming");
      window.setTimeout(() => {
        if (activeRef.current) setVoiceStatus("listening");
      }, 700);
    };
    recognition.onresult = (event) => {
      let chunk = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1)
        if (event.results[i].isFinal) chunk += event.results[i][0].transcript;
      if (chunk) {
        bufferRef.current = `${bufferRef.current} ${chunk}`.trim();
        setTranscript((value) => `${value} ${chunk}`.trim());
      }
    };
    recognition.onerror = (event) => {
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        activeRef.current = false;
        setVoiceStatus("error");
      } else if (activeRef.current) setVoiceStatus("reconnecting");
    };
    recognition.onend = () => {
      if (!activeRef.current) return setVoiceStatus("idle");
      setVoiceStatus("reconnecting");
      window.setTimeout(() => {
        if (activeRef.current) {
          try {
            recognition.start();
          } catch {
            /* restart guard */
          }
        }
      }, 250);
    };
    setVoiceStatus("warming");
    const warmup = navigator.mediaDevices?.getUserMedia
      ? navigator.mediaDevices.getUserMedia({ audio: true })
      : Promise.resolve(null);
    warmup
      .then((stream) => {
        stream?.getTracks().forEach((track) => track.stop());
        if (!activeRef.current) return;
        window.setTimeout(() => {
          try {
            recognition.start();
          } catch {
            activeRef.current = false;
            setVoiceStatus("error");
          }
        }, 300);
      })
      .catch(() => {
        activeRef.current = false;
        setVoiceStatus("error");
      });
  };
  return (
    <button type="button" className="voice" onClick={toggle}>
      <Mic size={15} />{" "}
      {voiceStatus === "listening"
        ? "Stop voice"
        : voiceStatus === "warming"
          ? "Preparing mic…"
          : voiceStatus === "reconnecting"
            ? "Reconnecting…"
            : "Voice"}
    </button>
  );
}

createRoot(document.getElementById("root")).render(<AppErrorBoundary><App /></AppErrorBoundary>);
