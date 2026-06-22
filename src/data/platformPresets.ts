export interface PlatformPreset {
  name: string;
  baseUrl: string;
}

export const PLATFORM_PRESETS: PlatformPreset[] = [
  // ── 官方 API ──
  { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { name: 'Anthropic (Claude)', baseUrl: 'https://api.anthropic.com/v1' },
  { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
  { name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  { name: '智谱 GLM (Zhipu)', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
  { name: 'Kimi (Moonshot)', baseUrl: 'https://api.moonshot.cn/v1' },
  { name: 'MiniMax', baseUrl: 'https://api.minimax.chat/v1' },
  { name: '阶跃星辰 (StepFun)', baseUrl: 'https://api.stepfun.com/v1' },
  { name: '百度千帆', baseUrl: 'https://qianfan.baidubce.com/v2' },
  { name: '阿里百炼 (Bailian)', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { name: '字节豆包 (DouBao)', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3' },
  { name: '小米 MiMo', baseUrl: 'https://api.xiaomimimo.com/v1' },
  { name: '小米 MiMo Token Plan', baseUrl: 'https://token-plan-cn.xiaomimimo.com/v1' },
  { name: 'Mistral AI', baseUrl: 'https://api.mistral.ai/v1' },
  { name: 'Cohere', baseUrl: 'https://api.cohere.com/v1' },
  { name: 'Perplexity', baseUrl: 'https://api.perplexity.ai' },

  // ── 国际平台 ──
  { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  { name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1' },
  { name: 'Together AI', baseUrl: 'https://api.together.xyz/v1' },
  { name: 'Fireworks AI', baseUrl: 'https://api.fireworks.ai/inference/v1' },
  { name: 'Novita AI', baseUrl: 'https://api.novita.ai/v3/openai' },
  { name: 'Nvidia NIM', baseUrl: 'https://integrate.api.nvidia.com/v1' },
  { name: 'GitHub Copilot', baseUrl: 'https://api.githubcopilot.com/v1' },
  { name: 'Codex (OpenAI)', baseUrl: 'https://api.openai.com/v1' },

  // ── 国内中转/聚合 ──
  { name: 'SiliconFlow', baseUrl: 'https://api.siliconflow.cn/v1' },
  { name: 'ModelScope', baseUrl: 'https://api-inference.modelscope.cn/v1' },
  { name: 'AiHubMix', baseUrl: 'https://aihubmix.com/v1' },
  { name: 'CCSub', baseUrl: 'https://api.ccsub.com/v1' },
  { name: '胜算云', baseUrl: 'https://api.shengsuan.com/v1' },
  { name: 'PatewayAI', baseUrl: 'https://api.pateway.cn/v1' },
  { name: 'BytePlus', baseUrl: 'https://api.byteplus.com/v1' },
  { name: 'DMXAPI', baseUrl: 'https://api.dmxapi.com/v1' },
  { name: 'ClaudeAPI', baseUrl: 'https://api.claudeapi.com/v1' },
  { name: 'ClaudeCN', baseUrl: 'https://api.claudecn.com/v1' },
  { name: 'RunAPI', baseUrl: 'https://api.runapi.com/v1' },
  { name: 'CherryIN', baseUrl: 'https://api.cherryin.com/v1' },
  { name: 'APINebula', baseUrl: 'https://api.apinebula.com/v1' },
  { name: 'AtlasCloud', baseUrl: 'https://api.atlascloud.dev/v1' },
  { name: 'APIKEY.FUN', baseUrl: 'https://api.apikey.fun/v1' },
  { name: 'CrazyRouter', baseUrl: 'https://api.crazyrouter.com/v1' },
  { name: 'OpenCode Go', baseUrl: 'https://api.opencode.dev/v1' },
  { name: '优云智算', baseUrl: 'https://api.youyun.ai/v1' },
  { name: 'CTok.ai', baseUrl: 'https://api.ctok.ai/v1' },
  { name: 'E-FlowCode', baseUrl: 'https://api.eflowcode.com/v1' },
  { name: 'TheRouter', baseUrl: 'https://api.therouter.ai/v1' },
  { name: 'PIPELLM', baseUrl: 'https://api.pipellm.com/v1' },
  { name: 'Unity2.ai', baseUrl: 'https://api.unity2.ai/v1' },
];
