import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { VerifyForm } from './VerifyForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';

type AuthMode = 'login' | 'register' | 'verify' | 'forgot_password';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [registeredEmail, setRegisteredEmail] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {mode === 'login' && (
        <LoginForm
          onSuccess={() => alert('Đăng nhập thành công!')}
          onSwitchToRegister={() => setMode('register')}
          onSwitchToForgotPassword={() => setMode('forgot_password')}
        />
      )}

      {mode === 'register' && (
        <RegisterForm
          onSuccess={() => {
            setRegisteredEmail('user@example.com');
            setMode('verify');
          }}
          onSwitchToLogin={() => setMode('login')}
        />
      )}

      {mode === 'verify' && (
        <VerifyForm
          email={registeredEmail}
          onSuccess={() => {
            alert('Xác thực thành công!');
            setMode('login');
          }}
          onSwitchToLogin={() => setMode('login')}
        />
      )}

      {mode === 'forgot_password' && (
        <ForgotPasswordForm
          onSuccess={() => setMode('login')}
          onSwitchToLogin={() => setMode('login')}
        />
      )}
    </div>
  );
};