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
      { role: "system", content: "你是严格受控的复试教授。只返回 JSON：{\"type\":\"CONTINUE|INTERRUPT|END_TOPIC|SWITCH_TOPIC\",\"reason\":\"...\",\"question\":\"...\"}。只有候选人本段出现明确研究兴趣、可验证证据缺口、方法取舍或个人贡献问题时才打断；不要因为时间或泛泛表达打断。" },
      { role: "user", content: `教授研究兴趣：${context.interests.join(", ")}\n当前议题：${context.topic || "未知"}\n候选人本段：${context.text}` },
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
      { role: "system", content: "你是保研复试反馈教练。只返回 JSON 数组，每项包含 tag, quote, issue, advice。quote 必须逐字引用候选人原话，不得编造。最多返回 5 项。" },
      { role: "user", content: `教授画像：${JSON.stringify(profile.professor_profile)}\n陈述：${JSON.stringify(segments)}\n问答：${JSON.stringify(qaLog)}` },
    ]);
    const evidence = jsonFrom(content);
    if (!Array.isArray(evidence)) throw new Error("invalid report");
    return { ...fallback, evidence: evidence.slice(0, 5) };
  } catch (error) {
    console.warn("DeepSeek report fallback:", error.message);
    return { ...fallback, evidence: analyzeEvidence(segments, qaLog) };
  }
}
