import { generateProfessorProfile } from "./profile";
import { decideInterruption } from "./controller";
import { analyzeEvidence } from "./feedback";

async function askDeepSeek(messages) {
  const response = await fetch("/api/deepseek", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) throw new Error(`DeepSeek request failed (${response.status})`);
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek returned no content");
  return content;
}

function jsonFrom(text) {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned);
}

export async function generateProfessorProfileAI(input) {
  try {
    const content = await askDeepSeek([
      { role: "system", content: "你是保研复试教授画像设计器。只返回合法 JSON，不要 Markdown。" },
      { role: "user", content: `根据教授资料和候选人材料生成画像。JSON 必须包含 professor_profile(name, affiliation, research_interests 数组, style, focus 数组)、relevant_projects 数组、intersections 数组、agenda 数组。agenda 每项包含 topic, importance, candidate_evidence, questions 数组, max_followups(不超过2)。议程要覆盖科研理解、个人贡献、专业基础、研究潜力，并且只使用材料中可验证内容。\n教授：${input.professorName}\n学校/实验室：${input.affiliation}\n方向：${input.researchDirection}\n主页：${input.homepage}\n论文：${input.papers}\n候选人材料：${input.candidateMaterials}\n个人陈述：${input.presentation}` },
    ]);
    const result = jsonFrom(content);
    if (!result.professor_profile || !Array.isArray(result.agenda) || !result.agenda.length) throw new Error("invalid profile");
    result.agenda = result.agenda.slice(0, 5).map((item) => ({ ...item, max_followups: Math.min(2, Number(item.max_followups) || 1), questions: Array.isArray(item.questions) ? item.questions.slice(0, 3) : [] }));
    return result;
  } catch (error) {
    console.warn("DeepSeek profile fallback:", error.message);
    return generateProfessorProfile(input);
  }
}

export async function decideInterruptionAI(context) {
  const local = decideInterruption(context);
  if (context.allowInterruption === false) return { type: "CONTINUE" };
  if (context.mode === "none" || context.interruptionCount >= (context.mode === "pressure" ? 4 : 2)) return { type: "CONTINUE" };
  if (context.lastInterruptionAt !== null && Math.abs(context.lastInterruptionAt - context.secondsLeft) < 35) return { type: "CONTINUE" };
  try {
    const content = await askDeepSeek([
      { role: "system", content: "你是严格受控的保研复试教授。只返回 JSON：{\"type\":\"CONTINUE|INTERRUPT|END_TOPIC|SWITCH_TOPIC\",\"reason\":\"...\",\"question\":\"...\"}。根据完整上下文判断是否真的需要打断。只有当前内容出现明确的研究兴趣、可验证证据缺口、方法取舍或个人贡献问题，且历史内容尚未充分回答时才打断；不要因为时间、泛泛表达或单个关键词打断。若已经覆盖当前议题，优先 END_TOPIC 或 SWITCH_TOPIC。" },
      { role: "user", content: `教授研究兴趣：${context.interests.join(", ")}\n当前议题：${context.topic || "未知"}\n议题覆盖摘要：${context.topicCoverage || "尚未覆盖"}\n已讲段落：${JSON.stringify(context.history || [])}\n已经触发的打断：${JSON.stringify(context.priorInterruptions || [])}\n当前候选人本段：${context.text}\n本段之后可见的证据：${context.hasLaterEvidence ? "已有补充证据" : "暂无"}` },
    ]);
    const result = jsonFrom(content);
    if (!["CONTINUE", "INTERRUPT", "END_TOPIC", "SWITCH_TOPIC"].includes(result.type)) throw new Error("invalid decision");
    if (result.type === "INTERRUPT" && !result.question) throw new Error("missing question");
    return result;
  } catch (error) {
    console.warn("DeepSeek interruption fallback:", error.message);
    return local;
  }
}

export async function generateQuestionsAI(profile) {
  try {
    const content = await askDeepSeek([
      { role: "system", content: "你是目标教授。只返回 JSON 数组，每项是一个中文面试问题。生成 3 个有深度且彼此不同的问题，覆盖方法理由、个人贡献、研究潜力。" },
      { role: "user", content: JSON.stringify(profile) },
    ]);
    const questions = jsonFrom(content);
    if (!Array.isArray(questions) || questions.length < 2) throw new Error("invalid questions");
    return questions.slice(0, 3);
  } catch (error) {
    console.warn("DeepSeek questions fallback:", error.message);
    return profile.agenda.flatMap((item) => item.questions || []).slice(0, 3);
  }
}

export async function generatePresentationContinuationAI({ profile, presentation, segments, interruption, answer }) {
  try {
    const content = await askDeepSeek([
      { role: "system", content: "你是保研复试中的候选人。只返回一段中文口语化陈述，不要 Markdown，不要解释。回答完教授打断后，承接原有演示稿继续讲 2-4 句。绝对不要重新做自我介绍、重新介绍项目背景或重复已讲过的句子；优先覆盖尚未讲到的实验、个人贡献、局限或下一步。如果原稿中的相关内容已经讲过，就直接跳到下一个未覆盖部分。" },
      { role: "user", content: `原演示稿：${presentation}\n已讲内容：${JSON.stringify(segments)}\n教授打断：${JSON.stringify(interruption)}\n候选人刚才回答：${answer}` },
    ]);
    const text = content.trim();
    if (!text) throw new Error("empty continuation");
    return text;
  } catch (error) {
    console.warn("DeepSeek presentation continuation fallback:", error.message);
    const source = String(presentation || "").split(/[。！？!?]/).map((part) => part.trim()).filter(Boolean);
    const used = new Set(segments.map((segment) => String(segment.text || "").slice(0, 24)));
    const next = source.find((part) => ![...used].some((prefix) => part.startsWith(prefix)));
    return next ? `${next}。` : "接下来我补充一下刚才还没有展开的实验限制和下一步计划。";
  }
}

export async function generateInterruptionAnswerAI({ profile, segments, interruption }) {
  try {
    const content = await askDeepSeek([
      { role: "system", content: "你是保研复试候选人。只返回一段自然的中文口语回答，不要 Markdown，不要解释。针对教授打断的问题，用 2-4 句直接回答，明确个人负责内容、方法理由或实验边界，不要重复整段背景。" },
      { role: "user", content: `教授画像：${JSON.stringify(profile?.professor_profile || {})}\n已讲内容：${JSON.stringify(segments)}\n教授打断：${JSON.stringify(interruption)}` },
    ]);
    const text = content.trim();
    if (!text) throw new Error("empty interruption answer");
    return text;
  } catch (error) {
    console.warn("DeepSeek interruption answer fallback:", error.message);
    return "我先直接回答这一点：我负责的是选择器实现、数据分层和消融实验，理论部分是和组员共同完成的。这个结论目前只在小规模设置下成立，选择器额外开销还需要单独核算。";
  }
}

export async function generateReportAI({ profile, segments, qaLog, fallback }) {
  try {
    const content = await askDeepSeek([
      { role: "system", content: "你是有经验的保研复试教授。请基于完整面试记录和教授 agenda 返回合法 JSON 对象，不要 Markdown。对象必须包含 overall_impression(整体印象字符串)、strengths(2-4 条具体优点数组)、recovery_score(仅依据输入中的确定分数，不要随机波动)、dimensions(数组，固定包含科研理解、个人贡献、证据与严谨性、方法取舍与研究思维、表达结构、打断恢复六项；每项包含 name, score(1-5), evidence(逐字原话或‘证据不足’), observation, impact)、priority_improvements(最多3项，每项包含 quote, category(事实错误|证据不足|表达可以更紧凑), issue, impact, advice)。只评价记录中有依据的内容；没有证据时写‘证据不足’，不要臆测；已经在后文补充的内容不能重复批评。若输入包含 overtimeSeconds > 0，必须在 priority_improvements 中明确指出超时及其影响。" },
      { role: "user", content: `教授画像：${JSON.stringify(profile.professor_profile)}\n陈述：${JSON.stringify(segments)}\n问答：${JSON.stringify(qaLog)}\n本轮确定计分：${JSON.stringify({ recovery: fallback.recovery, duration: fallback.duration, totalDuration: fallback.totalDuration, overtimeSeconds: fallback.overtimeSeconds, overtimePenalty: fallback.overtimePenalty })}` },
    ]);
    const report = jsonFrom(content);
    if (!report || typeof report !== "object" || !Array.isArray(report.dimensions)) throw new Error("invalid report");
    return {
      ...fallback,
      overallImpression: report.overall_impression || fallback.overallImpression,
      recovery: fallback.recovery,
      strengths: Array.isArray(report.strengths) ? report.strengths.slice(0, 4) : fallback.strengths,
      dimensions: report.dimensions.slice(0, 6),
      priorityImprovements: Array.isArray(report.priority_improvements) ? report.priority_improvements.slice(0, 3) : fallback.priorityImprovements,
      evidence: Array.isArray(report.priority_improvements) ? report.priority_improvements.slice(0, 5) : fallback.evidence,
    };
  } catch (error) {
    console.warn("DeepSeek report fallback:", error.message);
    return { ...fallback, evidence: analyzeEvidence(segments, qaLog) };
  }
}

export async function generateImprovedPresentationAI({ profile, presentation, report }) {
  try {
    const content = await askDeepSeek([
      { role: "system", content: "你是保研复试表达教练。只返回合法 JSON 对象，不要 Markdown。对象包含 script(一份 3-5 分钟、口语化但严谨的中文个人陈述) 和 edits(数组，最多 6 项；每项包含 original、improved、reason)。只标注实质性优化：补充缺失证据、澄清个人贡献、解释方法取舍、调整结构或删除明显重复；仅换同义词、标点、语气词或少量字词时不要放入 edits。script 必须保留原材料中的真实事实和数字，不得编造经历；改进应优先解决报告指出的问题，并加入自然自我介绍、个人贡献边界、方法理由和结论边界。" },
      { role: "user", content: `教授画像：${JSON.stringify(profile?.professor_profile || {})}\n原发言稿：${presentation}\n本轮报告：${JSON.stringify(report)}` },
    ]);
    const result = jsonFrom(content);
    if (!result || typeof result.script !== "string" || !result.script.trim()) throw new Error("invalid improved script");
    const edits = (Array.isArray(result.edits) ? result.edits : []).filter((edit) => {
      const original = String(edit.original || "").replace(/[\s，。！？、,.!?；;：:‘’“”"']/g, "");
      const improved = String(edit.improved || "").replace(/[\s，。！？、,.!?；;：:‘’“”"']/g, "");
      if (!original || !improved || original === improved) return false;
      return Math.abs(original.length - improved.length) >= 8 || !original.includes(improved.slice(0, Math.min(12, improved.length)));
    }).slice(0, 6);
    return { script: result.script.trim(), edits };
  } catch (error) {
    console.warn("DeepSeek improved presentation fallback:", error.message);
    return { script: String(presentation || "").trim(), edits: [] };
  }
}
