import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Shield, Mail, Lock, User, CheckCircle, AlertCircle, ArrowRight, UploadCloud } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthPageProps {
  onSuccess: () => void;
  onSkip: () => void;
}

export default function AuthPage({ onSuccess, onSkip }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Realizar Login com Firebase Auth
        await signInWithEmailAndPassword(auth, email, password);
        setSuccessMsg('Login realizado com sucesso! Redirecionando...');
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else {
        // Validar nome
        if (!name.trim()) {
          throw new Error('Por favor, informe seu nome.');
        }

        // Criar usuário no Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Atualizar perfil
        await updateProfile(user, { displayName: name });

        // Criar registro de metadados de usuário no Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email || '',
          displayName: name,
          role: 'user', // padrão é usuário normal
          createdAt: Date.now(),
          status: 'active'
        });

        setSuccessMsg('Conta criada com sucesso! Redirecionando...');
        setTimeout(() => {
          onSuccess();
        }, 1200);
      }
    } catch (err: any) {
      console.error(err);
      let message = 'Ocorreu um erro ao processar. Verifique seus dados.';
      if (err.code === 'auth/wrong-password') message = 'Senha incorreta.';
      else if (err.code === 'auth/user-not-found') message = 'Nenhum usuário encontrado com este e-mail.';
      else if (err.code === 'auth/email-already-in-use') message = 'Este e-mail já está em uso.';
      else if (err.code === 'auth/weak-password') message = 'A senha deve conter pelo menos 6 caracteres.';
      else if (err.code === 'auth/invalid-email') message = 'E-mail inválido.';
      else if (err.message) message = err.message;
      
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0F172A] p-4 transition-colors duration-300">
      {/* Background blobs for depth */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/80 rounded-2xl p-8 shadow-xl dark:shadow-2xl/40 relative z-10"
        id="auth-card"
      >
        {/* App Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 mb-4">
            <UploadCloud size={30} strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-950 dark:text-white tracking-tight">
            AppShare
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Seu MediaFire de aplicativos APK e arquivos
          </p>
        </div>

        {/* Message banners */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm mb-6"
            id="auth-error"
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 text-sm mb-6"
            id="auth-success"
          >
            <CheckCircle size={18} className="shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Nome Completo
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-850 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                  placeholder="Ex: João Silva"
                  required={!isLogin}
                  id="auth-name-input"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              E-mail
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Mail size={18} />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-850 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                placeholder="Ex: joao@exemplo.com"
                required
                id="auth-email-input"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Senha
              </label>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock size={18} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-850 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                placeholder={isLogin ? "Sua senha" : "Mínimo de 6 caracteres"}
                required
                id="auth-password-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 cursor-pointer mt-2"
            id="auth-submit-btn"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isLogin ? 'Entrar na Conta' : 'Criar Conta Grátis'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Toggle between login and registration */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center text-sm">
          <p className="text-slate-500 dark:text-slate-400">
            {isLogin ? 'Não tem uma conta?' : 'Já possui uma conta?'}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="ml-1 text-blue-500 font-semibold hover:underline cursor-pointer"
              id="auth-toggle-btn"
            >
              {isLogin ? 'Cadastre-se' : 'Faça Login'}
            </button>
          </p>
        </div>

        {/* Guest access option */}
        <button
          onClick={onSkip}
          className="w-full mt-4 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors uppercase tracking-wider cursor-pointer"
          id="auth-skip-btn"
        >
          Explorar como Visitante
        </button>
      </motion.div>
    </div>
  );
}
