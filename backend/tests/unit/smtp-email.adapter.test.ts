import { createServer, Server as NetServer } from 'node:net';
import { connect as connectTls, createServer as createTlsServer, ConnectionOptions, Server as TlsServer, TLSSocket } from 'node:tls';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SmtpEmailAdapter, SmtpSettings } from '../../identity-store-service/src/auth/smtp-email.adapter';

const key = readFileSync(join(__dirname, 'fixtures/smtp-test-key.pem'));
const cert = readFileSync(join(__dirname, 'fixtures/smtp-test-cert.pem'));
const settings = (port: number): SmtpSettings => ({ host: 'localhost', port, user: 'test-user', password: 'test-password', from: 'sender@example.test', publicUrl: 'https://store.example.test' });

function smtpPeer(options: { invalidEhlo?: boolean } = {}) {
  const commands: string[] = [];
  let dataMode = false;
  const server: TlsServer = createTlsServer({ key, cert }, (socket: TLSSocket) => {
    socket.write('220 local.test ready\r\n');
    let pending = '';
    socket.on('data', chunk => {
      pending += chunk.toString('utf8');
      let end: number;
      while ((end = pending.indexOf('\r\n')) !== -1) {
        const line = pending.slice(0, end); pending = pending.slice(end + 2);
        if (dataMode) {
          commands.push(line);
          if (line === '.') { dataMode = false; socket.write('250 2.0.0 queued\r\n'); }
          continue;
        }
        commands.push(line);
        if (line.startsWith('EHLO ')) socket.write(options.invalidEhlo ? '550 no ehlo\r\n' : '250-local.test\r\n250 AUTH PLAIN\r\n');
        else if (line.startsWith('AUTH PLAIN ')) socket.write('235 authenticated\r\n');
        else if (line.startsWith('MAIL FROM:')) socket.write('250 sender ok\r\n');
        else if (line.startsWith('RCPT TO:')) socket.write('250 recipient ok\r\n');
        else if (line === 'DATA') { dataMode = true; socket.write('354 send data\r\n'); }
        else if (line === 'QUIT') { socket.write('221 goodbye\r\n'); socket.end(); }
        else socket.write('500 unexpected command\r\n');
      }
    });
  });
  return { server, commands };
}

async function listen(server: NetServer): Promise<number> {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return (server.address() as any).port;
}

function adapter(port: number) {
  return new SmtpEmailAdapter(settings(port), (options: ConnectionOptions) => connectTls({ ...options, ca: cert }));
}

describe('SmtpEmailAdapter local SMTP exchange', () => {
  it('sends verification, password reset, and staff invitation through complete SMTP exchanges', async () => {
    const peer = smtpPeer();
    const port = await listen(peer.server);
    try {
      const client = adapter(port);
      await client.sendVerificationEmail('verify@example.test', 'verify-token');
      await client.sendPasswordResetEmail('reset@example.test', 'reset-token');
      await client.sendStaffInvitationEmail('staff@example.test');
      expect(peer.commands.filter(line => line === 'EHLO pbl6.local')).toHaveLength(3);
      expect(peer.commands.filter(line => line.startsWith('AUTH PLAIN '))).toHaveLength(3);
      expect(peer.commands.filter(line => line.startsWith('MAIL FROM:'))).toHaveLength(3);
      expect(peer.commands.filter(line => line.startsWith('RCPT TO:'))).toEqual([
        'RCPT TO:<verify@example.test>', 'RCPT TO:<reset@example.test>', 'RCPT TO:<staff@example.test>',
      ]);
      expect(peer.commands.filter(line => line === 'DATA')).toHaveLength(3);
      expect(peer.commands.filter(line => line === 'QUIT')).toHaveLength(3);
      expect(peer.commands).toContain('Subject: Verify your PBL6 email');
      expect(peer.commands).toContain('Subject: Reset your PBL6 password');
      expect(peer.commands).toContain('Subject: You are invited to a PBL6 Store');
    } finally { await new Promise<void>(resolve => peer.server.close(() => resolve())); }
  });

  it('rejects an invalid SMTP response and reports a connection failure safely', async () => {
    const peer = smtpPeer({ invalidEhlo: true });
    const port = await listen(peer.server);
    try {
      const error = await adapter(port).sendVerificationEmail('user@example.test', 'token').catch(value => value);
      expect(error.getStatus()).toBe(503);
      expect(error.getResponse()).toEqual(expect.objectContaining({ code: 'EMAIL_DELIVERY_UNAVAILABLE' }));
    } finally { await new Promise<void>(resolve => peer.server.close(() => resolve())); }

    const closed = createServer();
    const unusedPort = await listen(closed);
    await new Promise<void>(resolve => closed.close(() => resolve()));
    const error = await adapter(unusedPort).sendVerificationEmail('user@example.test', 'token').catch(value => value);
    expect(error.getStatus()).toBe(503);
    expect(error.getResponse()).toEqual(expect.objectContaining({ code: 'EMAIL_DELIVERY_UNAVAILABLE' }));
  });
});
