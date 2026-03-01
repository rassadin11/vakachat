interface LogoProps {
  size?: number;
}

function AnthropicLogo({ size = 32 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="9" fill="#CC785C" />
      {/* Two A shapes — Anthropic brand mark */}
      <path
        d="M14 30L18.5 18H16.5L12 30H14ZM20 18L24.5 30H26.5L22 18H20ZM15.5 26L16.5 23H23.5L24.5 26H15.5Z"
        fill="white"
      />
    </svg>
  );
}

function OpenAILogo({ size = 32 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="9" fill="#0D0D0D" />
      {/* Simplified OpenAI asterisk/gear */}
      <path
        d="M20 10.5C14.75 10.5 10.5 14.75 10.5 20C10.5 25.25 14.75 29.5 20 29.5C25.25 29.5 29.5 25.25 29.5 20C29.5 14.75 25.25 10.5 20 10.5ZM20 12.5C24.14 12.5 27.5 15.86 27.5 20C27.5 24.14 24.14 27.5 20 27.5C15.86 27.5 12.5 24.14 12.5 20C12.5 15.86 15.86 12.5 20 12.5Z"
        fill="white"
        opacity="0.4"
      />
      <line x1="20" y1="10" x2="20" y2="30" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="11.3" y1="15" x2="28.7" y2="25" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="28.7" y1="15" x2="11.3" y2="25" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function GoogleLogo({ size = 32 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="9" fill="#F8F8F8" />
      {/* Google G */}
      <path
        d="M28.5 20.3H21V23.3H26C25.6 25.1 24.3 26.5 22.5 27.4C21.5 27.9 20.3 28.2 19 28.2C15.2 28.2 12.1 25.1 12.1 21.3C12.1 17.5 15.2 14.4 19 14.4C20.8 14.4 22.4 15.1 23.7 16.2L25.9 14C23.9 12.2 21.6 11.1 19 11.1C13.5 11.1 9.1 15.6 9.1 21.1C9.1 26.6 13.5 31.1 19 31.1C21.6 31.1 24 30.1 25.8 28.4C27.7 26.6 28.7 24.1 28.7 21.2C28.7 20.9 28.6 20.6 28.5 20.3Z"
        fill="#4285F4"
      />
      <path d="M28.5 20.3H21V23.3H26C25.6 25.1 24.3 26.5 22.5 27.4L25.8 28.4C27.7 26.6 28.7 24.1 28.7 21.2C28.7 20.9 28.6 20.6 28.5 20.3Z" fill="#34A853" />
      <path d="M12.1 21.3C12.1 20.1 12.4 19 12.9 18.1L9.9 15.8C9.1 17.4 8.6 19.2 8.6 21.1C8.6 23 9.1 24.8 9.9 26.4L12.9 24.1C12.4 23.2 12.1 22.3 12.1 21.3Z" fill="#FBBC05" />
      <path d="M19 11.1C21.6 11.1 23.9 12.1 25.7 13.8L28 11.5C25.9 9.6 22.6 8.4 19 8.4C14.8 8.4 11.1 10.7 9.1 14.1L12.1 16.5C13.2 13.4 15.9 11.1 19 11.1Z" fill="#EA4335" />
    </svg>
  );
}

function DeepSeekLogo({ size = 32 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="9" fill="#1040D8" />
      {/* D shape */}
      <path
        d="M10 12H17C21.4 12 25 15.6 25 20C25 24.4 21.4 28 17 28H10V12ZM14 16V24H17C19.2 24 21 22.2 21 20C21 17.8 19.2 16 17 16H14Z"
        fill="white"
      />
      {/* S shape */}
      <path
        d="M27 13C27 11.9 27.9 11 29 11H31V13H29.5C29.2 13 29 13.2 29 13.5C29 13.8 29.2 14 29.5 14H30C31.1 14 32 14.9 32 16C32 17.1 31.1 18 30 18H28V16H29.5C29.8 16 30 15.8 30 15.5C30 15.2 29.8 15 29.5 15H29C27.9 15 27 14.1 27 13Z"
        fill="white"
        opacity="0.7"
      />
      <text x="27" y="28" textAnchor="middle" fill="white" fontSize="13" fontWeight="700" fontFamily="monospace">S</text>
    </svg>
  );
}

function GlmLogo({ size = 32 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="9" fill="#5B35D5" />
      <text x="20" y="26" textAnchor="middle" fill="white" fontSize="12" fontWeight="700" fontFamily="-apple-system, sans-serif">GLM</text>
    </svg>
  );
}

function KimiLogo({ size = 32 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="9" fill="#0F1C3F" />
      {/* Crescent moon via two circles */}
      <circle cx="19" cy="20" r="9" fill="white" />
      <circle cx="23" cy="18" r="8" fill="#0F1C3F" />
    </svg>
  );
}

function DefaultLogo({ size = 32 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="9" fill="#333" />
      <circle cx="20" cy="20" r="6" stroke="white" strokeWidth="2" fill="none" />
    </svg>
  );
}

function getProvider(modelId: string): string {
  if (modelId.startsWith('anthropic/')) return 'anthropic';
  if (modelId.startsWith('google/')) return 'google';
  if (modelId.startsWith('openai/')) return 'openai';
  if (modelId.startsWith('deepseek/')) return 'deepseek';
  if (modelId.startsWith('thudm/')) return 'glm';
  if (modelId.startsWith('moonshotai/')) return 'kimi';
  return 'default';
}

interface ProviderLogoProps {
  modelId: string;
  size?: number;
}

export function ProviderLogo({ modelId, size = 32 }: ProviderLogoProps) {
  const provider = getProvider(modelId);
  switch (provider) {
    case 'anthropic': return <AnthropicLogo size={size} />;
    case 'openai':    return <OpenAILogo size={size} />;
    case 'google':    return <GoogleLogo size={size} />;
    case 'deepseek':  return <DeepSeekLogo size={size} />;
    case 'glm':       return <GlmLogo size={size} />;
    case 'kimi':      return <KimiLogo size={size} />;
    default:          return <DefaultLogo size={size} />;
  }
}
