export function analyzeEvidence(segments = [], qaLog = []) {
  const findings = [];
  for (const segment of segments) {
    const text = segment.text || '';
    if (/明显|显著|很多|表现更好|提升比较明显/.test(text) && !(/\d/.test(text))) findings.push({ quote: text.slice(0, 120), issue: '成果只有方向性描述，没有指标或对照组。', advice: '补充具体数字、评测集和对比基线，例如“准确率从 61% 提升到 78%”。', tag: '证据不足' });
    if (/参与了|参与项目|协作完成|我们负责/.test(text) && !(/我负责|我的主要工作|具体/.test(text))) findings.push({ quote: text.slice(0, 120), issue: '个人贡献边界不清，教授无法判断你亲自完成了什么。', advice: '先说个人负责的模块，再说明团队协作关系和最终结果。', tag: '个人贡献' });
    if (/采用了 Multi-Agent|多智能体|multi[- ]?agent/i.test(text) && !(/为什么|理由|因为|单 Agent|单agent/i.test(text))) findings.push({ quote: text.slice(0, 120), issue: '提到了关键方法，但没有解释为什么它是必要的。', advice: '补充方法选择依据，并与更简单的单 Agent 基线比较。', tag: '方法取舍' });
  }
  for (const item of qaLog) if ((item.answer || '').trim().length < 35) findings.push({ quote: item.answer || '[回答过短]', issue: `对“${item.question}”的回答展开不足，缺少推理或证据。`, advice: '使用“结论 - 依据 - 局限/下一步”的结构补充回答。', tag: '科研理解' });
  return findings.slice(0, 6);
}
