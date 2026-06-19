const crypto = require('crypto');

const cookieName = 'galeria_session';

function getSecret() {
  return process.env.SESSION_SECRET || 'dev-secret-change-me';
}

function sign(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

function createSession(user) {
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    username: user.username,
    displayName: user.display_name || user.displayName,
    exp: Date.now() + 1000 * 60 * 60 * 12
  })).toString('base64url');

  return `${payload}.${sign(payload)}`;
}

function verifySession(token) {
  try {
    if (!token || !token.includes('.')) return null;
    const [payload, signature] = token.split('.');
    const expected = sign(payload);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (signatureBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!session.exp || session.exp < Date.now()) return null;
    return session;
  } catch (error) {
    return null;
  }
}

function setSessionCookie(res, user) {
  const token = createSession(user);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${cookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200${secure}`
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

function requireAuth(req, res, next) {
  const session = verifySession(req.cookies[cookieName]);
  if (!session) return res.status(401).json({ message: 'Necesitas iniciar sesion.' });
  req.user = session;
  next();
}

function currentUser(req) {
  return verifySession(req.cookies[cookieName]);
}

module.exports = { requireAuth, setSessionCookie, clearSessionCookie, currentUser };
