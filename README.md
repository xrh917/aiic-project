# aiic-project

面向理工科本科生保研复试的 AI Professor Interview Simulator。它根据目标教授与候选人材料生成有研究 agenda 的模拟导师，并在个人陈述中主动打断、控制节奏，最后给出可执行的恢复建议。

## 开始使用

### 环境要求

- Node.js 20+

### 安装

```bash
npm install
```

### 运行

```bash
npm run dev
```

## 项目结构

- `src/main.jsx`：Setup、教授画像、Presentation、Q&A、Report 状态流
- `src/profile.js`：结构化教授画像与 hidden agenda mock 生成
- `src/controller.js`：教授兴趣、证据、时间和 agenda 控制信号

## 开发与测试

```bash
npm test
npm run build
```

当前版本使用本地 mock，保留了替换为 OpenAI-compatible LLM 和 ASR 的边界；语音按钮使用浏览器 Speech Recognition，不支持时文字模式仍可完整运行。

## 贡献

欢迎提交 Issue 和 Pull Request。提交前请确保相关检查和测试通过。

## 许可证

待定。
