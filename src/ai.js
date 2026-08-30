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

export async function generateReportAI({ profile, segments, qaLog, fallback }) {
  try {
    const content = await askDeepSeek([
      { role: "system", content: "你是有经验的保研复试教授。请基于完整面试记录和教授 agenda 返回合法 JSON 对象，不要 Markdown。对象必须包含 overall_impression(整体印象字符串)、strengths(2-4 条具体优点数组)、dimensions(数组，固定包含科研理解、个人贡献、证据与严谨性、方法取舍与研究思维、表达结构、打断恢复六项；每项包含 name, score(1-5), evidence(逐字原话或‘证据不足’), observation, impact)、priority_improvements(最多3项，每项包含 quote, category(事实错误|证据不足|表达可以更紧凑), issue, impact, advice)。只评价记录中有依据的内容；没有证据时写‘证据不足’，不要臆测；已经在后文补充的内容不能重复批评。" },
      { role: "user", content: `教授画像：${JSON.stringify(profile.professor_profile)}\n陈述：${JSON.stringify(segments)}\n问答：${JSON.stringify(qaLog)}` },
    ]);
    const report = jsonFrom(content);
    if (!report || typeof report !== "object" || !Array.isArray(report.dimensions)) throw new Error("invalid report");
    return {
      ...fallback,
      overallImpression: report.overall_impression || fallback.overallImpression,
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
