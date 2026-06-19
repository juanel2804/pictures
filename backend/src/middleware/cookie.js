module.exports = function cookieParser(req, res, next) {
  const header = req.headers.cookie || '';
  req.cookies = header.split(';').reduce((cookies, part) => {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey) return cookies;
    cookies[rawKey] = decodeURIComponent(rawValue.join('='));
    return cookies;
  }, {});
  next();
};
