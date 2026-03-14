import { cssVariables } from './theme';

/**
 * 全局样式
 */
export const globalStyles = `
${cssVariables}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background-color: var(--color-bg-base);
  color: var(--color-text);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--color-bg-elevated);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-secondary);
}

/* 选择文本样式 */
::selection {
  background-color: rgba(247, 147, 26, 0.3);
  color: var(--color-text);
}

/* 链接样式 */
a {
  color: var(--color-primary);
  text-decoration: none;
  transition: opacity 0.2s ease;
}

a:hover {
  opacity: 0.8;
}

/* 数字字体 (用于金额显示) */
.font-mono {
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
}

/* 渐变文字 */
.gradient-text {
  background: linear-gradient(135deg, #F7931A 0%, #FFB800 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 卡片渐变边框效果 */
.card-gradient-border {
  position: relative;
  background: var(--color-bg-container);
  border-radius: 12px;
}

.card-gradient-border::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  padding: 1px;
  background: linear-gradient(135deg, rgba(247, 147, 26, 0.5), transparent 50%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

/* 发光效果 */
.glow-primary {
  box-shadow: 0 0 20px rgba(247, 147, 26, 0.3);
}

/* 禁用态 */
.disabled {
  opacity: 0.5;
  pointer-events: none;
}
`;

export default globalStyles;
