'use client';

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useReferral } from "@/lib/hooks";
import { isAddress } from "viem";
import { 
  X, 
  Users, 
  Check, 
  AlertCircle, 
  Loader2,
  Gift
} from "lucide-react";

interface BindReferrerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultReferrer?: string;
}

export function BindReferrerModal({ isOpen, onClose, defaultReferrer = '' }: BindReferrerModalProps) {
  const { bindReferrer, isLoading, isBindSuccess, error, referralLink } = useReferral();
  const [inputValue, setInputValue] = React.useState(defaultReferrer);
  const [validationError, setValidationError] = React.useState('');
  const [showSuccess, setShowSuccess] = React.useState(false);

  // 当 defaultReferrer 变化时更新输入框
  React.useEffect(() => {
    if (defaultReferrer) {
      setInputValue(defaultReferrer);
    }
  }, [defaultReferrer]);

  // 监听绑定成功
  React.useEffect(() => {
    if (isBindSuccess) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);
    }
  }, [isBindSuccess, onClose]);

  // 验证输入
  const validateInput = (value: string): boolean => {
    if (!value.trim()) {
      setValidationError('请输入推荐人地址或推荐码');
      return false;
    }
    
    // 检查是否为有效地址
    if (isAddress(value)) {
      setValidationError('');
      return true;
    }
    
    // 检查是否为推荐码（长度至少6位）
    if (value.trim().length >= 6) {
      setValidationError('');
      return true;
    }
    
    setValidationError('请输入有效的以太坊地址或推荐码');
    return false;
  };

  // 处理绑定
  const handleBind = async () => {
    if (!validateInput(inputValue)) return;
    
    // 如果是推荐码，需要解析为地址
    let referrerAddress = inputValue.trim();
    
    // 如果不是地址格式，假设是推荐码，尝试解析
    if (!isAddress(referrerAddress)) {
      // 这里可以通过合约查询推荐码对应的地址
      // 暂时直接使用输入值作为地址
      setValidationError('暂不支持推荐码绑定，请输入推荐人钱包地址');
      return;
    }
    
    await bindReferrer(referrerAddress);
  };

  // 处理跳过
  const handleSkip = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleSkip}
          />
          
          {/* 弹窗 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
          >
            <div className="relative bg-gradient-to-br from-[rgba(20,20,35,0.98)] to-[rgba(10,10,15,0.98)] border border-[#00f5ff]/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(0,245,255,0.15)]">
              {/* 关闭按钮 */}
              <button
                onClick={handleSkip}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>

              {/* 成功提示 */}
              <AnimatePresence>
                {showSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute inset-0 flex items-center justify-center bg-[rgba(20,20,35,0.98)] rounded-3xl z-10"
                  >
                    <div className="text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 15, stiffness: 200 }}
                        className="w-20 h-20 rounded-full bg-[#00ff88]/20 border border-[#00ff88]/50 flex items-center justify-center mx-auto mb-4"
                      >
                        <Check size={40} className="text-[#00ff88]" />
                      </motion.div>
                      <h3 className="text-xl font-bold text-white mb-2">绑定成功！</h3>
                      <p className="text-white/60">您已成功绑定推荐人</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 头部 */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00f5ff]/20 to-[#ff00ff]/20 flex items-center justify-center mx-auto mb-4">
                  <Users size={32} className="text-[#00f5ff]" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">绑定推荐人</h2>
                <p className="text-white/60 text-sm">
                  绑定推荐人后可获得额外奖励
                </p>
              </div>

              {/* 输入框 */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    推荐人地址或推荐码
                  </label>
                  <Input
                    type="text"
                    placeholder="请输入推荐人钱包地址"
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      setValidationError('');
                    }}
                    disabled={isLoading}
                    className={validationError ? 'border-red-500' : ''}
                  />
                  {validationError && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-1 mt-2 text-sm text-red-400"
                    >
                      <AlertCircle size={14} />
                      {validationError}
                    </motion.p>
                  )}
                </div>

                {/* 错误提示 */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-red-500/10 border border-red-500/30"
                  >
                    <p className="flex items-center gap-2 text-sm text-red-400">
                      <AlertCircle size={16} />
                      {error}
                    </p>
                  </motion.div>
                )}
              </div>

              {/* 奖励说明 */}
              <div className="p-4 rounded-xl bg-[#00f5ff]/5 border border-[#00f5ff]/20 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Gift size={18} className="text-[#00f5ff]" />
                  <span className="text-white font-medium">推荐奖励机制</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-white/60">
                    <span>一级推荐</span>
                    <span className="text-[#00f5ff]">10% 奖励</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>二级推荐</span>
                    <span className="text-[#ff00ff]">5% 奖励</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>三级推荐</span>
                    <span className="text-[#bd00ff]">3% 奖励</span>
                  </div>
                </div>
              </div>

              {/* 按钮组 */}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={handleSkip}
                  disabled={isLoading}
                >
                  跳过
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleBind}
                  isLoading={isLoading}
                  disabled={!inputValue.trim() || isLoading}
                >
                  确认绑定
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default BindReferrerModal;
