import { createEmailAdapter, DevelopmentMockEmailAdapter, emailActionLink, SmtpEmailAdapter, smtpSettings } from '../../identity-store-service/src/auth/smtp-email.adapter';
import { createRuntimeAuthService } from '../../shared/src/bootstrap';

const valid = {
  SMTP_HOST: 'smtp.example.test', SMTP_PORT: '465', SMTP_USER: 'mailer', SMTP_PASSWORD: 'private-test-value',
  SMTP_FROM: 'no-reply@example.test', WEB_ORIGIN: 'https://shop.example.test', NODE_ENV: 'production',
} as NodeJS.ProcessEnv;

describe('SMTP email configuration and runtime wiring', () => {
  test('production bootstrap selects the SMTP adapter', () => {
    const service = createRuntimeAuthService('M3', valid) as any;
    expect(service.emailAdapter).toBeInstanceOf(SmtpEmailAdapter);
    expect((createRuntimeAuthService('M1', valid) as any).emailAdapter).toBeUndefined();
  });

  test('SMTP configuration is validated and uses the configured public URL', () => {
    expect(smtpSettings(valid)).toMatchObject({ host: 'smtp.example.test', port: 465, from: 'no-reply@example.test', publicUrl: 'https://shop.example.test' });
    expect(() => createEmailAdapter({ ...valid, SMTP_PASSWORD: '' })).toThrow('SMTP_PASSWORD');
    expect(() => createEmailAdapter({ ...valid, SMTP_PORT: 'not-a-port' })).toThrow('SMTP_PORT');
    expect(() => createEmailAdapter({ ...valid, SMTP_FROM: 'bad' })).toThrow('SMTP_FROM');
    expect(() => createEmailAdapter({ ...valid, WEB_ORIGIN: 'javascript:alert(1)' })).toThrow('WEB_ORIGIN');
    expect(emailActionLink(smtpSettings(valid), 'verify-email', 'a+b/token')).toBe('https://shop.example.test/verify-email?token=a%2Bb%2Ftoken');
  });

  test('mock delivery requires an explicit development-only selection', () => {
    expect(createEmailAdapter({ NODE_ENV: 'development', EMAIL_ADAPTER: 'mock' })).toBeInstanceOf(DevelopmentMockEmailAdapter);
    expect(() => createEmailAdapter({ NODE_ENV: 'production', EMAIL_ADAPTER: 'mock' })).toThrow('EMAIL_ADAPTER');
    expect(() => createEmailAdapter({ NODE_ENV: 'development', EMAIL_ADAPTER: 'unexpected' })).toThrow('EMAIL_ADAPTER');
  });
});
