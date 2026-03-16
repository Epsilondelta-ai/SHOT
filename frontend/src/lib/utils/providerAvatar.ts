import claudeImg from '$lib/assets/claude.svg';
import deepseekImg from '$lib/assets/deepseek.png';
import geminiImg from '$lib/assets/gemini.webp';
import openaiImg from '$lib/assets/openai.svg';
import xaiImg from '$lib/assets/xai.svg';

const PROVIDER_AVATARS: Record<string, string> = {
  anthropic: claudeImg,
  openai: openaiImg,
  google: geminiImg,
  xai: xaiImg,
  deepseek: deepseekImg,
};

export function getProviderAvatar(provider: string | null | undefined): string | null {
  if (!provider) return null;
  return PROVIDER_AVATARS[provider] ?? null;
}
