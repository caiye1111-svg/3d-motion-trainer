'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

interface AuthFormProps {
  mode: 'login' | 'signup';
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { signIn, signUp, error, clearError, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setMessage('');
    setSubmitting(true);

    if (mode === 'signup') {
      const { error: err } = await signUp(email, password, nickname || email.split('@')[0]);
      if (err) {
        setSubmitting(false);
      } else {
        setMessage('注册成功！请检查邮箱完成验证（或直接登录）。');
        setSubmitting(false);
      }
    } else {
      const { error: err } = await signIn(email, password);
      if (err) {
        setSubmitting(false);
      } else {
        router.push('/training');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">
          {mode === 'login' ? '登录' : '注册'}
        </h1>
        <p className="text-slate-400 text-sm text-center mb-8">
          {mode === 'login' ? '欢迎回来，继续你的训练' : '开始你的 3D 适应训练之旅'}
        </p>

        {message && (
          <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-4 mb-6">
            <p className="text-emerald-300 text-sm">{message}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 mb-6">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">昵称</label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="你的昵称"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="至少 6 位"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-all"
          >
            {submitting ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          {mode === 'login' ? (
            <>
              还没有账号？{' '}
              <a href="/auth/signup" className="text-emerald-400 hover:underline">
                注册
              </a>
            </>
          ) : (
            <>
              已有账号？{' '}
              <a href="/auth/login" className="text-emerald-400 hover:underline">
                登录
              </a>
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-600 text-center mt-6">
        注册即表示你已阅读并同意安全说明
      </p>
    </div>
  );
}
