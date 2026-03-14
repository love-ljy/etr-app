import type { ThemeConfig } from 'antd';

/**
 * 赤道ETR DAPP - Ant Design 深色主题配置
 * 遵循UI设计规范: 专业DeFi深色主题
 */

// 品牌色和语义色
export const colors = {
  // 主色调
  primary: '#F7931A',        // 比特币橙 - ETR品牌色
  secondary: '#627EEA',      // 以太坊蓝
  
  // 背景色
  bgBase: '#0D1117',         // 页面主背景
  bgContainer: '#161B22',    // 卡片背景
  bgElevated: '#21262D',     // 悬停/次级背景
  
  // 边框和分割
  border: '#30363D',         // 分割线、边框
  
  // 文字色
  textPrimary: '#F0F6FC',    // 主要文字
  textSecondary: '#8B949E',  // 辅助文字
  textDisabled: '#484F58',   // 禁用文字
  
  // 状态色
  success: '#00D084',        // 成功/收益
  warning: '#FFB800',        // 警告
  error: '#FF4757',          // 错误/危险
  info: '#58A6FF',           // 信息
};

// Ant Design 主题配置
export const themeConfig: ThemeConfig = {
  token: {
    // 品牌色
    colorPrimary: colors.primary,
    
    // 背景色
    colorBgBase: colors.bgBase,
    colorBgContainer: colors.bgContainer,
    colorBgElevated: colors.bgElevated,
    colorBgLayout: colors.bgBase,
    
    // 边框色
    colorBorder: colors.border,
    colorBorderSecondary: colors.border,
    
    // 文字色
    colorText: colors.textPrimary,
    colorTextSecondary: colors.textSecondary,
    colorTextDisabled: colors.textDisabled,
    
    // 状态色
    colorSuccess: colors.success,
    colorWarning: colors.warning,
    colorError: colors.error,
    colorInfo: colors.info,
    
    // 圆角
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 4,
    
    // 字体
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    
    // 间距
    paddingLG: 24,
    paddingMD: 16,
    paddingSM: 12,
    paddingXS: 8,
  },
  components: {
    Button: {
      borderRadius: 8,
      controlHeight: 48,
      controlHeightLG: 56,
      controlHeightSM: 32,
      primaryShadow: '0 4px 12px rgba(247, 147, 26, 0.3)',
    },
    Card: {
      borderRadius: 12,
      colorBorderSecondary: colors.border,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 48,
      colorBgContainer: colors.bgBase,
      colorBorder: colors.border,
      colorPrimaryHover: colors.primary,
      activeShadow: `0 0 0 3px rgba(247, 147, 26, 0.2)`,
    },
    InputNumber: {
      borderRadius: 8,
      controlHeight: 48,
    },
    Select: {
      borderRadius: 8,
      controlHeight: 48,
      colorBgContainer: colors.bgBase,
    },
    Modal: {
      borderRadius: 16,
      colorBgElevated: colors.bgContainer,
      headerBg: colors.bgContainer,
    },
    Table: {
      borderRadius: 12,
      colorBgContainer: colors.bgContainer,
      headerBg: colors.bgElevated,
    },
    Tabs: {
      colorBorderSecondary: colors.border,
      inkBarColor: colors.primary,
    },
    Progress: {
      defaultColor: colors.primary,
      colorSuccess: colors.success,
    },
    Statistic: {
      colorTextHeading: colors.textSecondary,
      colorTextDescription: colors.textSecondary,
    },
    Switch: {
      colorPrimary: colors.primary,
    },
    Tooltip: {
      borderRadius: 8,
      colorBgSpotlight: colors.bgElevated,
    },
    Dropdown: {
      borderRadius: 8,
      colorBgElevated: colors.bgElevated,
    },
    Menu: {
      borderRadius: 8,
      colorItemBgSelected: colors.bgElevated,
      colorItemTextSelected: colors.primary,
    },
  },
};

// CSS变量导出 (用于非Ant Design组件)
export const cssVariables = `
  :root {
    --color-primary: ${colors.primary};
    --color-secondary: ${colors.secondary};
    --color-bg-base: ${colors.bgBase};
    --color-bg-container: ${colors.bgContainer};
    --color-bg-elevated: ${colors.bgElevated};
    --color-border: ${colors.border};
    --color-text: ${colors.textPrimary};
    --color-text-secondary: ${colors.textSecondary};
    --color-text-disabled: ${colors.textDisabled};
    --color-success: ${colors.success};
    --color-warning: ${colors.warning};
    --color-error: ${colors.error};
    --color-info: ${colors.info};
    --border-radius: 8px;
    --border-radius-lg: 12px;
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;
    --spacing-2xl: 48px;
  }
`;

export default themeConfig;
