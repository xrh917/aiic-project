export function generateProfessorProfile(input) {
  const direction = input.researchDirection.trim() || '智能系统与机器学习';
  const name = input.professorName.trim() || 'Professor Wang';
  const evidence = input.candidateMaterials.trim() || '尚未提供具体项目材料';
  return {
    professor_profile: {
      name,
      affiliation: input.affiliation.trim() || '目标实验室',
      research_interests: direction.split(/[,，、\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 4),
      style: '严谨、直接，会围绕研究动机和个人贡献追问；不鼓励绕开问题的长篇陈述。',
      focus: ['科研理解与问题定义', '方法选择的理由', '个人贡献与可验证证据', '研究潜力与专业基础']
    },
    relevant_projects: [
      { title: '候选人材料中的相关经历', evidence: evidence.slice(0, 180) }
    ],
    intersections: [
      `将候选人的项目经验与“${direction}”连接起来`,
      '从模糊成果描述中追问可量化结果与个人负责部分'
    ],
    agenda: [
      { topic: '研究动机与问题定义', importance: 0.9, candidate_evidence: evidence.slice(0, 120), questions: ['你为什么选择这个问题？', '这个问题最难的地方是什么？'], max_followups: 2 },
      { topic: '方法与技术取舍', importance: 0.85, candidate_evidence: direction, questions: ['为什么使用这个方法？如果换一种方法会怎样？'], max_followups: 2 },
      { topic: '个人贡献与研究潜力', importance: 0.8, candidate_evidence: evidence.slice(0, 100), questions: ['你具体负责了哪一部分？', '如果继续做，你下一步会验证什么？'], max_followups: 2 }
    ]
  };
}
