export default function (_req, res, next) {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  next();
}
