'use client';

import { useState, useEffect } from 'react';

/**
 * 客户端挂载检查 Hook
 * 用于确保组件只在客户端渲染
 */
export function useHasMounted() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted;
}

/**
 * 客户端渲染包装组件
 * 在服务端渲染时返回占位符，客户端挂载后才渲染子组件
 */
interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const hasMounted = useHasMounted();

  if (!hasMounted) {
    return fallback;
  }

  return children;
}

export default ClientOnly;
