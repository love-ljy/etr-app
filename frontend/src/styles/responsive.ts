/**
 * ETR DApp - 响应式工具函数和样式
 * 用于处理移动端适配和响应式布局
 */

/**
 * 响应式断点（与 Ant Design 一致）
 */
export const breakpoints = {
  xs: 480,   // 超小屏幕（手机）
  sm: 576,   // 小屏幕（大手机）
  md: 768,   // 中等屏幕（平板）
  lg: 992,   // 大屏幕（小桌面）
  xl: 1200,  // 超大屏幕（桌面）
  xxl: 1600, // 超大屏幕（大桌面）
};

/**
 * 媒体查询工具
 */
export const mediaQueries = {
  xs: `@media (max-width: ${breakpoints.xs}px)`,
  sm: `@media (max-width: ${breakpoints.sm}px)`,
  md: `@media (max-width: ${breakpoints.md}px)`,
  lg: `@media (max-width: ${breakpoints.lg}px)`,
  xl: `@media (max-width: ${breakpoints.xl}px)`,
};

/**
 * 响应式字体大小
 */
export const responsiveFontSizes = {
  hero: {
    desktop: 48,
    tablet: 36,
    mobile: 28,
  },
  h1: {
    desktop: 32,
    tablet: 28,
    mobile: 24,
  },
  h2: {
    desktop: 24,
    tablet: 22,
    mobile: 20,
  },
  h3: {
    desktop: 20,
    tablet: 18,
    mobile: 16,
  },
  h4: {
    desktop: 16,
    tablet: 15,
    mobile: 14,
  },
  body: {
    desktop: 14,
    tablet: 14,
    mobile: 13,
  },
  small: {
    desktop: 12,
    tablet: 12,
    mobile: 11,
  },
};

/**
 * 响应式间距
 */
export const responsiveSpacing = {
  xs: { desktop: 4, tablet: 4, mobile: 4 },
  sm: { desktop: 8, tablet: 8, mobile: 6 },
  md: { desktop: 16, tablet: 12, mobile: 10 },
  lg: { desktop: 24, tablet: 20, mobile: 16 },
  xl: { desktop: 32, tablet: 24, mobile: 20 },
  xxl: { desktop: 48, tablet: 32, mobile: 24 },
};

/**
 * 动画配置
 */
export const animations = {
  // 淡入
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
  // 从下滑入
  slideUp: `
    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(20px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
  // 脉冲（用于加载）
  pulse: `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `,
  // 闪烁（用于提示）
  shimmer: `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `,
};

/**
 * 动画时长
 */
export const animationDurations = {
  fast: '0.15s',
  normal: '0.25s',
  slow: '0.4s',
};

/**
 * 缓动函数
 */
export const easings = {
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

/**
 * CSS 工具类生成器
 */
export const generateUtilityClasses = () => `
  /* 响应式容器 */
  .responsive-container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
  }
  
  @media (max-width: 768px) {
    .responsive-container {
      padding: 0 16px;
    }
  }
  
  @media (max-width: 480px) {
    .responsive-container {
      padding: 0 12px;
    }
  }
  
  /* 卡片悬停效果 */
  .card-hover {
    transition: transform ${animationDurations.normal} ${easings.default},
                box-shadow ${animationDurations.normal} ${easings.default};
  }
  
  .card-hover:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
  
  /* 按钮悬停效果 */
  .btn-hover {
    transition: all ${animationDurations.fast} ${easings.default};
  }
  
  .btn-hover:hover {
    transform: scale(1.02);
  }
  
  .btn-hover:active {
    transform: scale(0.98);
  }
  
  /* 淡入动画 */
  .fade-in {
    animation: fadeIn ${animationDurations.normal} ${easings.easeOut};
  }
  
  /* 从下滑入 */
  .slide-up {
    animation: slideUp ${animationDurations.slow} ${easings.easeOut};
  }
  
  /* 加载骨架屏 */
  .skeleton {
    background: linear-gradient(
      90deg,
      #21262d 25%,
      #30363d 50%,
      #21262d 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
  
  /* 触摸友好 */
  .touch-friendly {
    min-height: 44px;
    min-width: 44px;
  }
  
  /* 文字截断 */
  .text-ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  /* 多行文字截断 */
  .text-ellipsis-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  /* 隐藏滚动条但保持滚动 */
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  
  /* 玻璃态效果 */
  .glass {
    background: rgba(22, 27, 34, 0.8);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }
  
  /* 渐变文字 */
  .gradient-text {
    background: linear-gradient(135deg, #F7931A 0%, #FFB800 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  /* 发光效果 */
  .glow-primary {
    box-shadow: 0 0 20px rgba(247, 147, 26, 0.3);
  }
  
  /* 响应式字体 */
  .font-responsive-hero {
    font-size: ${responsiveFontSizes.hero.mobile}px;
  }
  
  @media (min-width: 768px) {
    .font-responsive-hero {
      font-size: ${responsiveFontSizes.hero.tablet}px;
    }
  }
  
  @media (min-width: 1024px) {
    .font-responsive-hero {
      font-size: ${responsiveFontSizes.hero.desktop}px;
    }
  }
  
  /* 响应式内边距 */
  .p-responsive {
    padding: 16px;
  }
  
  @media (min-width: 768px) {
    .p-responsive {
      padding: 24px;
    }
  }
  
  @media (min-width: 1024px) {
    .p-responsive {
      padding: 32px;
    }
  }
`;

/**
 * 生成完整的 CSS
 */
export const generateGlobalStyles = () => `
  ${animations.fadeIn}
  ${animations.slideUp}
  ${animations.pulse}
  ${animations.shimmer}
  ${generateUtilityClasses()}
`;

export default {
  breakpoints,
  mediaQueries,
  responsiveFontSizes,
  responsiveSpacing,
  animations,
  animationDurations,
  easings,
  generateUtilityClasses,
  generateGlobalStyles,
};
