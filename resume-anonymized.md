# 工作经历（脱敏简历版）

## CircuitGraph（投稿 2026 国际会议）

### 问题产生

由于符号缺乏标准化以及结构化训练数据稀缺，现有多模态大语言模型（MLLMs）在识别用于描述芯片设计的系统级图时受到限制。（如图一左上角不同样子的 DAC，跳线，无箭头的电路图）（这个问题来源于某 EDA 精英挑战赛赛题 2）

### 我们的贡献点

#### 1. 任务分解框架（图 1 左下角）

提出一种系统级图识别任务分解方法，将问题拆分为四个子任务，并对应三个语义层级：

- 感知层：Listing、Localization
- 结构层：Connection
- 语义层：Circuit QA

这种分层结构为复杂视觉推理提供了一种通用范式。

#### 2. CircuitGraph 数据集

构建首个系统级图多模态数据集 CircuitGraph，包含 10,977 条连接关系标注、15,515 条带推理过程的 QA 样本，并对四个子任务提供完整标注。该数据集填补了通用视觉语言数据集与 EDA 领域之间的数据空白。且“非标准化”电路数据转为标准网表这件事很重要。

#### 3. 多智能体 workflow（图一右侧）

提出解耦的多智能体工作流，将复杂视觉推理拆分为 Perception（感知）、Reasoning（推理）和 Knowledge（知识）。该架构不仅在 CircuitGraph 上表现优异，还能以仅 60 张图像适配 [脱敏模拟电路数据集]，并为不同模型提供最高达 128× 的性能提升。

#### 4. 渐进式训练流程（基模：某开源视觉语言模型 3B）

提出一种训练流程，结合选 Pretrain model、SFT、RL 和任务特定 LoRA。

### 输入输出

输入：非标准化的系统级电路图。输出：网表。

### 具体 workflow

Perception Agent 使用 YOLOv11 nano，yolo 框出每个器件并且按从左到右从上到下给器件标号；Reasoning Agent 使用 3B VLM，VLM 看到完整的图表，然后预测组件输出连接；Knowledge Agent 加载用于特定任务的 lora 权重，lora 的设置使得我们的 workflow 能低成本泛化到新的任务。

### 评估以及实验以及结果

评估是在某 2025 EDA 挑战赛问题二中的 CircuitGraph 基准上进行的。任务 1 包括组件检测（S1）、输出计数（S2）和连接识别（S3）。任务 2 涵盖电路 QA。报告所有指标的 F1 分数。总得分遵循官方公式。

我们的结果与领域专用方法（EDA 挑战赛第一名 / 某电路识别领域的最先进方法）/开源多模态大模型/闭源商业模型（E2E）对比，得分最高（0.671）。

同时，把我们的 workflow 用于开源多模态大模型/闭源商业模型，可以看到它们的效果获得了倍数提升（比如某商业多模态模型提升 128.7 倍）。消融实验证明我们的每一块方法都是有效果的。

### 迁移到 [脱敏模拟电路数据集]

1. 从 [脱敏模拟电路数据集] 分层采样 30 个测试样本（简单：中等：难 = 7:2:1）
2. 用 60 张图像重新训练 YOLO detector
3. 不评测 detection 任务
4. 使用 multi-agent workflow 推理
5. 评测三项任务：Connection Identification、Connection Judgement、Textual QA
6. 作为 zero-shot cross-domain transfer 实验

## HDL-Skill：LLM Skill-Based Front-End Design Generation Platform（投稿 2026 EDA 设计会议）

### 我们的贡献

提出 HDL-Skill 平台（一个统一的、可复用的 RTL 生成技能平台），核心思想：把 RTL 设计能力拆解为可组合的“Skill”。

### 贡献 1：Agent Skill-based RTL design 平台

HDL-Skill 是第一个基于 agent skill 的前端设计平台。使用三层结构：

- 第一层：HDL-Skill（顶层）
- 第二层：Step Skill，包含 6 个 workflow step：RTL_SPEC、TB_SPEC、RTL_GEN、TB_GEN、EDA_TOOL、OTHERS
- 第三层：Circuit Skills，最底层 42 个技能，来源于 11 个 work

特点：根据 EDA 前端设计流程将 RTL 流程拆成 6 个步骤；每个能力封装成 circuit skill；支持即插即用组合。

### 贡献 2：Circuit Skill Library

survey 100+ 论文，选择 11 个开源项目，提取 42 个 circuit skills，并分为 6 个 workflow 阶段和 24 个 skill 组合（eg. S1 G1 E1 O1）。同时提出 Circuit Skill Builder 和自动提取 skill。

### 贡献 3：Agent Skill RAG 经验复用

不用 embedding；sub-millisecond retrieval（按层级快速、轻量检索）；lightweight 经验复用。

### 贡献 4：模块化 Skill 组合实验

把一些闭环或者纠错的 skill 加入本来没有 react 的工作，显著提升效果。在困难 benchmark 上 Pass@1 从 0 → 0.805，超过 hierarchy-verilog 和 VerilogCoder，与 MAGE 持平（sota 的工作）。

### 输入输出

输入：Config Template 文件（指定每个 workflow step 使用哪些 skills）、Question List（问题列表）、RTL 任务 specification description。输出：主要是 RTL 代码。

### 评估以及实验结果

我们从 VerilogEval v2 的 156 个任务中筛选出了某代码模型（xhigh）准确率为 0 的 41 个作为测试集，通过给该模型加不同的 skill 组合，发现它准确率提升；并且结果跟 sota 的工作（MAGE）基本持平。

table1：HDL-Skill 的 workflow 分解和单个 skill 是否真的有效。table2：HDL-Skill 能否组合不同项目的技能，并超过原始方法。

### 下一步

准备投稿某 ICCAD 会议。新增：

1. multiagent system（LangGraph 标准化 skills.md）
2. 在 skill 系统中加入 Yosys、DREAMPlace、OpenROAD 三个 EDA 后端工作，真正实现 EDA 全流程的平台
3. 总结各个 step 的经验后自动加入记忆库，并且实现 skill 和 memory 的自进化
4. 参考超参数的选择，调参算法变成 skills，最终可以让 agent 自己探索并找到最优解

## DataAtlas：Structure-aware Multi-Agent Framework for Scientific Dataset Discovery（投稿 2026 数据挖掘会议）

### 问题

在现代科研中，选择合适的数据集（dataset discovery）仍然是一个高度人工的过程，成为科研效率的重要瓶颈。论文指出三个核心问题：

1. Dataset discovery 很困难：数据集分散在不同领域和平台，数据集选择依赖隐含社区经验，数据集匹配需要满足复杂约束（模态、标注、协议等）。
2. Dataset recommendation 的三个技术挑战：cold-start problem、dataset long-tail problem，以及需要 evidence-backed recommendation。
3. 仅返回 dataset name 不够。研究者还需要数据集用于什么任务、被哪些论文使用，以及一套标准化的测试和评估方法。

### 贡献

论文提出 DataAtlas 系统，主要贡献三点：

1. 提出 structure-aware multi-agent dataset discovery framework，使用论文-数据集使用记录二分图、multi-agent pipeline，并由 reason agent 打分和给出证据。最终知识库规模为 97,955 usage records、39,023 papers、4,586 datasets。
2. 提出 multi-channel retrieval + reasoning pipeline（多通道检索 + 推理），核心创新包括基于图的检索、evidence-card reasoning 和 multi-agent workflow，提升 long-tail dataset recall 与 cold-start recommendation。
3. 跨领域数据集发现分析：在通用人工智能、计算社会科学、定量生物学三个领域测试，发现数据集标准化程度比知识库规模更重要。

### 输入输出与实验

输入只使用论文 title、abstract 作为 query，以及一个 paper-dataset bipartite graph。输出 Top-K datasets，并附带 evidence、reasoning、score。

我们采用随机选取的 2025 年之后的 arXiv 论文，并按时间确保它在我们的推荐系统中不可见。采用主流文本匹配、图推荐和 multiagent 推荐方法，与我们的系统一起给这些论文推荐数据集，结果表明 DataAtlas 在 recall@10 就达到 0.663，效果显著好于其他推荐算法。

### 我的主要工作

构建图部分推荐系统。为了解决冷启动问题，使用 LightGCN 来学习 dataset embedding。用文本 encoder 得到论文 embedding。用 contrastive learning（InfoNCE loss）让（paper, dataset）使用关系相似。

## 比赛类经历

### 全国机器人赛事暨机器人世界杯中国赛的具身大模型挑战赛，获得亚军（一等奖）

核心任务：基于某具身大模型，系统评估并提升其三大具身智能核心能力：指令规划、感知理解、可供性分析。

核心挑战：时间紧，仅有一周训练时间；数据瓶颈，缺乏带思维链标注的数据，数据标注成本高。

方法：两阶段 SFT（第一阶段：在官方给的两个数据集上；第二阶段：考虑到模型在 Navigation 指标上的表现下降了很多，我们在某视觉语言导航数据集的子集上进行导航能力专项 SFT）。

### 某高校新青年极客松

在某高校发起的新青年极客松中合作完成 CircuitGraph（面向非标准电路系统框图的解析框架），获得前沿探索赛道一等奖。

### 某 EDA 精英挑战赛（CircuitGraph 前身）

赛题：某开源视觉语言模型做电路以及连接关系识别 & 电路知识 QA。  
我做了：我们的架构是 SFT + RL + LoRA；我负责用某开源训练框架进行 LoRA 训练。

## 3 方法论

借鉴 HDL-Skill 的工作流分解和步骤级技能层次结构，我们提出了一个用于长周期 RTL 设计的框架，该框架将前端生成、后端评估和经验重用于一个单一的优化循环中。其主要瓶颈在于，仅依赖提示的多技能流水线可能生成可编译的中间 RTL，但它们无法提供对跨步骤恢复的显式控制，未将后端 QoR（质量结果）作为决策信号，也未能以阶段感知的方式重用过往经验。为解决这些局限，本框架围绕三个紧密耦合的模块构建：（1）图编排智能体 EDA 系统，将松散耦合的多技能协作转变为可调度、可恢复、有状态的执行图；（2）后端感知的 RTL 优化模块，在统一的抽象下整合综合与物理设计工具，将后端 QoR 提升为一等优化信号；（3）分层自演进经验记忆库，支持低开销检索与受控的记忆演化。这三个模块共同构成了一个从 RTL 生成到后端驱动优化的闭环。

### 3.1 图编排智能体 EDA 系统

长周期 RTL 设计需要的远不止串联基于提示的技能：中间产物必须经过验证，故障必须被定位，可恢复的错误必须被路由到正确的上游步骤。给定设计规范、约束、执行历史与工具反馈，该框架旨在寻找能通过所执行的前端验证流程，并能根据报告的后端评估流程在下游实现指标上得到改进的 RTL。与主要关注前端 RTL 生成与调试的 HDL-Skill 不同，我们的方案将 RTL 设计视为一个涵盖前端验证与后端实现的闭环问题。该框架保留了 HDL-Skill 的六类技能，即 rtl_spec、rtl_gen、tb_spec、tb_gen、eda_tool 和 others，同时将在线主路径精简为 rtl_spec → rtl_gen → eda_tool → others。这样既保持了搜索的聚焦性，又能在后续反馈暴露上游问题时，保留跨步骤回滚与修复的能力。

为使编排显式化而非由提示驱动，每项技能都被标准化为一个带有明确定义执行契约的类型化算子：包括入口点、统一命令行接口、输入/输出模式、指标模式以及问题/评估模式。编排层利用此契约来验证输入、生成 resolved_input.json、调用底层工具并收集 result.json。由此，技能变成了可替换的执行单元，而非临时编写的提示片段或脚本别名。

我们将时间步 t 的全局状态表示为 X_t = (q_t, s_t, a_t, r_t, m_t)，其中 q_t 表示当前图节点或阶段，s_t 表示中间设计状态，a_t 表示动作轨迹，r_t 表示汇总的前端与后端反馈，m_t 表示注入的记忆信号。在实际操作中，该状态记录了阶段状态、步骤结果、产物引用、修复状态、编译反馈、综合试验、被提升的网表、后端结果以及全局最佳记录。因此，图执行是一个结构化的状态转移过程，带有显式的路由条件，而非松散的提示序列。

对于除初始化和最终签核外的每个设计步骤，执行层实例化一个七节点微循环：select → prepare → execute → check → reflect → record → gate。其中，select 对候选技能进行排序；prepare 绑定选中的候选技能并整合相关记忆来组装输入；execute 调用技能或将控制权委托给专门的子图；check 验证输出及阶段特定的要求；reflect 决定下一步动作；record 将结果写回全局状态；gate 决定下一步的转移。这种结构提供了局部重试、候选回退、流程延续以及跨步骤恢复的能力。特别地，可恢复的失败可以通过 compile_feedback 路由回上游的 RTL 修复，而不是终止整个流程。

select 节点并未将固定技能绑定到每个步骤，而是采用多级排序策略。对于步骤 p 的候选技能集合 K_p = {k_1, ..., k_n}，排序得分定义为 rank(k_i) = semantic(k_i) + policy_boost(k_i) + λ · policy_step_score(k_i)。其中第一项衡量与当前任务和状态的语义相关性，后两项由策略记忆提供。候选技能随后会依据执行契约和输入匹配度进行筛选，之后才被选中。

### 3.2 后端感知的 RTL 优化与工具调用及 DSE

仅凭前端编译和仿真难以准确反映下游实现质量。因此，我们将 eda_tool 实现为一个专门的 EDA 子图，将综合与物理设计的反馈注入优化循环中。其基于轮次的执行流程如下：validate_init → plan_frontend → execute_frontend → promote_frontend → plan_backend → execute_backend → aggregate_round → round_decision。

该子图验证优化设置，探索综合候选方案，将有潜力的网表提升至后端评估，汇总联合结果，并决定是否继续搜索。工具调用通过稳定的接口而非原始 shell 命令进行，因此综合、后端执行、报告解析以及设计启动都作为基于契约的能力模块来处理。

其核心设计选择是将后端报告从最终阶段诊断转变为一等决策信号。系统从后端报告中提取并标准化时序、DRC、线长、功耗和面积指标，并计算出一个后端奖励，作为候选方案比较时保真度更高的信号。前端与后端通过两个奖励通道耦合：J_front = proxy_reward(m_syn)，J_back = true_reward(m_pnr)。其中 m_syn 汇总了综合侧的统计数据，m_pnr 汇总了布局布线后的指标。后端奖励对 DRC 违规施加强惩罚，随后按时序、线长、功耗和面积对候选方案进行排序。因此，后端反馈会影响候选方案的提升、预算分配、停止决策，并在必要时触发上游 RTL 修复。

我们将整体设计空间表述为 D = R × C × P，其中 R 是 RTL 结构空间，C 是约束与综合配置空间，P 是后端参数空间。这三个子空间并非独立搜索。相反，C 和 P 由 EDA 子图的轮次控制器更新，而 R 则通过从 eda_tool 回到 rtl_gen 的跨步骤修复路径进行优化。这形成了一个前端生成与后端实现之间的耦合优化循环。

在综合阶段，系统会探索一个有限但可扩展的参数空间，涵盖综合策略、面积偏好和时钟配置。早期的轮次强调覆盖率，以避免过早收敛到狭窄区域，而后期轮次则利用历史 proxy_reward 统计数据，并继承那些先前带来优秀后端结果的候选方案中有效的参数覆盖。在后端阶段，规划器使用两类配置档案：用于广泛探索的基础档案，以及用于围绕成功设置进行聚焦搜索的、从历史派生的利用性档案。随后，一个联合轮次控制器在综合候选方案、被提升的网表和后端试验之间分配预算，并决定何时继续或停止。因此，我们框架中的 DSE 是一个耦合的、基于轮次的控制器，它根据代理奖励和更高保真度的奖励来重新分配优化精力，而非两个割裂的前端与后端搜索。

### 3.3 分层自演进经验记忆库

长周期执行同样依赖于对先前案例的选择性重用：加载完整轨迹成本高昂，而扁平化的检索则常常注入无关的上下文。因此，我们引入了一个分层的、阶段感知的经验记忆库，沿两个维度组织。工作流维度按设计步骤、执行环境和阶段（如 generate、repair、error、review、handoff）对经验进行索引。经验类型维度将条目分为 Rule（规则）、Template（模板）和 Action（动作），分别对应稳定的约束、更高层级的决策模式以及可直接执行的修复知识。除了运行时记忆，该框架还维护跨轮次运行的策略记忆，记录案例级别的技能链、不同配置文件下的链模板以及步骤级别的技能得分。

给定当前状态 X_t，该框架执行阶段感知的按需检索，而不是加载完整的历史轨迹。运行时加载器首先构建一个特定于阶段的加载计划，例如在生成阶段优先加载 Rule + Template，在修复阶段优先加载 Rule + Action。随后，路由器根据步骤、环境和加载阶段进行粗粒度过滤，再根据当前错误特征和关键词进行细粒度匹配，最后仅将少量前 top-k 个相关条目注入到活动的技能上下文中。与扁平化的向量 RAG 不同，这种检索流程首先受限于工作流阶段，再通过故障模式进行细化，从而减少了令牌开销和无关上下文的注入。策略记忆也通过 policy_boost 和 policy_step_score 反作用于 3.1 节中的技能排序机制，因此记忆既影响修复内容，也影响执行路径的选择。

与 HDL-Skill 的第二个区别在于，记忆并非静态的。共享的运行时记忆默认是只读的，以降低污染风险，但该框架允许在实验设置中进行受控的回写和模板提升。已验证的故障可以被提炼为动作级别的修复条目，而成功的跨轮次技能链则会定期被总结为链模板和步骤级别的有效性得分。高置信度的模板随后可能被提升到更高级别的记忆中，重复出现的故障模式则被记录下来，用于离线聚类和抽象。随着时间的推移，知识库将从特定于案例的修复，逐步演变为可重用的重写模式、时序修复模板以及后端参数预设，同时保持在线上下文开销较小。
