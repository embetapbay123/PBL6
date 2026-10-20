import { connect as connectTls, TLSSocket } from 'node:tls';
import { randomUUID } from 'node:crypto';
import { ApiError } from '../../../shared/src/errors';
import type { IEmailAdapter } from './auth.service';

export type SmtpSettings = { host: string; port: number; user: string; password: string; from: string; publicUrl: string };

export function emailActionLink(settings: Pick<SmtpSettings, 'publicUrl'>, path: 'verify-email' | 'reset-password', token: string) {
  const url = new URL(path, `${settings.publicUrl}/`);
  url.searchParams.set('token', token);
  return url.toString();
}

export class DevelopmentMockEmailAdapter implements IEmailAdapter {
  private unavailable(): never {
    throw new ApiError(503, 'EMAIL_DELIVERY_UNAVAILABLE', 'Mock email mode does not deliver messages. Configure SMTP or inject a test capture adapter.');
  }
  async sendVerificationEmail(_email: string, _token: string): Promise<void> { this.unavailable(); }
  async sendPasswordResetEmail(_email: string, _token: string): Promise<void> { this.unavailable(); }
  async sendStaffInvitationEmail(_email: string): Promise<void> { this.unavailable(); }
}

export function createEmailAdapter(env: NodeJS.ProcessEnv = process.env): IEmailAdapter {
  const mode = env.EMAIL_ADAPTER ?? 'smtp';
  if (mode === 'mock' && env.NODE_ENV === 'development') return new DevelopmentMockEmailAdapter();
  if (mode !== 'smtp') throw new Error('Invalid EMAIL_ADAPTER configuration');
  return new SmtpEmailAdapter(smtpSettings(env));
}

export function smtpSettings(env: NodeJS.ProcessEnv = process.env): SmtpSettings {
  const required = (key: string) => {
    const value = env[key]?.trim();
    if (!value) throw new Error(`Missing configuration: ${key}`);
    return value;
  };
  const port = Number(required('SMTP_PORT'));
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid configuration: SMTP_PORT');
  const from = required('SMTP_FROM');
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from)) throw new Error('Invalid configuration: SMTP_FROM');
  let publicUrl: URL;
  try { publicUrl = new URL(required('WEB_ORIGIN')); } catch { throw new Error('Invalid configuration: WEB_ORIGIN'); }
  if (!['http:', 'https:'].includes(publicUrl.protocol) || publicUrl.username || publicUrl.password) throw new Error('Invalid configuration: WEB_ORIGIN');
  return { host: required('SMTP_HOST'), port, user: required('SMTP_USER'), password: required('SMTP_PASSWORD'), from, publicUrl: publicUrl.origin };
}

// Small SMTP client: implicit TLS is required so credentials are never sent in clear text.
export class SmtpEmailAdapter implements IEmailAdapter {
  constructor(private readonly settings: SmtpSettings) {}

  sendVerificationEmail(email: string, token: string) {
    return this.send(email, 'Verify your PBL6 email', 'verify-email', token, 'Verify email');
  }

  sendPasswordResetEmail(email: string, token: string) {
    return this.send(email, 'Reset your PBL6 password', 'reset-password', token, 'Reset password');
  }

  sendStaffInvitationEmail(email: string) {
    return this.sendMessage(email, 'You are invited to a PBL6 Store', `${this.settings.publicUrl}/customer/invitations`,
      'View your Store invitation', 'Sign in to PBL6 with the invited email address to review and accept the invitation.');
  }

  private async send(to: string, subject: string, path: 'verify-email' | 'reset-password', token: string, action: string): Promise<void> {
    const link = emailActionLink(this.settings, path, token);
    return this.sendMessage(to, subject, link, action, 'This link expires in 15 minutes.');
  }

  private async sendMessage(to: string, subject: string, link: string, action: string, details: string): Promise<void> {
    const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
    const text = `${action}: ${link}\r\n${details}`;
    const boundary = `pbl6-${randomUUID()}`;
    const body = [
      `From: <${this.settings.from}>`, `To: <${to}>`, `Subject: ${subject}`, 'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`, '', `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64', '', Buffer.from(text).toString('base64'),
      `--${boundary}`, 'Content-Type: text/html; charset=utf-8', 'Content-Transfer-Encoding: base64', '',
      Buffer.from(`<p>${escapeHtml(action)}</p><p><a href="${escapeHtml(link)}">${escapeHtml(action)}</a></p><p>${escapeHtml(details)}</p>`).toString('base64'),
      `--${boundary}--`, '',
    ].join('\r\n');
    try { await this.deliver(to, body); }
    catch { throw new ApiError(503, 'EMAIL_DELIVERY_UNAVAILABLE', 'Email delivery is temporarily unavailable.'); }
  }

  private async deliver(to: string, message: string): Promise<void> {
    const socket = connectTls({ host: this.settings.host, port: this.settings.port, servername: this.settings.host });
    socket.setTimeout(15000, () => socket.destroy(new Error('SMTP timeout')));
    const lines: string[] = [];
    let pending = '';
    const waiters: Array<(line: string) => void> = [];
    socket.on('data', chunk => {
      pending += chunk.toString('utf8');
      let at: number;
      while ((at = pending.indexOf('\r\n')) >= 0) {
        const line = pending.slice(0, at); pending = pending.slice(at + 2); lines.push(line);
        const waiter = waiters.shift(); if (waiter) waiter(line);
      }
    });
    const read = async () => {
      if (lines.length) return lines.shift()!;
      return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('SMTP timeout')), 15000);
        waiters.push(line => { clearTimeout(timer); resolve(line); });
        socket.once('error', reject);
      });
    };
    const reply = async (codes: number[]) => {
      let line = await read();
      const code = Number(line.slice(0, 3));
      while (line[3] === '-') line = await read();
      if (!codes.includes(code)) throw new Error('SMTP rejected command');
    };
    const command = async (line: string, codes: number[]) => { socket.write(`${line}\r\n`); await reply(codes); };
    try {
      await reply([220]);
      await command('EHLO pbl6.local', [250]);
      await command(`AUTH PLAIN ${Buffer.from(`\0${this.settings.user}\0${this.settings.password}`).toString('base64')}`, [235]);
      await command(`MAIL FROM:<${this.settings.from}>`, [250]);
      await command(`RCPT TO:<${to}>`, [250, 251]);
      await command('DATA', [354]);
      const safeMessage = message.replace(/(^|\r\n)\./g, '$1..');
      socket.write(`${safeMessage}\r\n.\r\n`);
      await reply([250]);
      await command('QUIT', [221]);
    } finally { socket.end(); }
  }
}
