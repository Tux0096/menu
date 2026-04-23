import connect from 'connect';
import { promises as fs } from 'fs';

const app = connect();

app.use('/api-front/v1/version', async (req, res, next) => {
  try {
    const frontVersion = await fs.readFile('build-version.txt');
    res.end(String(frontVersion));
  } catch (e) {
    res.end('0');
  }

  next();
});

export default app;
