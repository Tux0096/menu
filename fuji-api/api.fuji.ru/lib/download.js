import { basename } from 'path';
import { URL } from 'url';
import { createWriteStream, existsSync, unlink } from 'fs';
import { get as getHttps } from 'https';
import { get as getHttp } from 'http';

const MAX_RETRIES = 5;
const RETRY_DELAY = 1000;
const TIMEOUT = 15000; // 15 seconds

export default function download(url, dest, retries = 0) {
  const uri = new URL(url);
  dest = dest || basename(uri.pathname);
  const pkg = url.toLowerCase().startsWith('https:') ? getHttps : getHttp;

  return new Promise((resolve, reject) => {
    if (existsSync(dest)) {
      resolve('Image already downloaded');
      return;
    }

    const request = pkg(uri.href, (res) => {
      if (res.statusCode === 200) {
        const file = createWriteStream(dest);
        res.pipe(file);

        res.on('end', () => {
          file.end();
          resolve();
        });

        res.on('error', (err) => {
          unlink(dest, () => {
            if (retries < MAX_RETRIES) {
              setTimeout(() => {
                download(url, dest, retries + 1).then(resolve).catch(reject);
              }, RETRY_DELAY);
            } else {
              reject(err);
            }
          });
        });
      } else if ([301, 302].includes(res.statusCode)) {
        download(res.headers.location, dest, retries).then(resolve).catch(reject);
      } else {
        reject(new Error(`Download request failed, response status: ${res.statusCode} ${res.statusMessage}`));
      }
    });

    request.on('error', (err) => {
      if (retries < MAX_RETRIES) {
        setTimeout(() => {
          download(url, dest, retries + 1).then(resolve).catch(reject);
        }, RETRY_DELAY);
      } else {
        reject(err);
      }
    });

    request.setTimeout(TIMEOUT, () => {
      request.abort();
      reject(new Error(`Request timeout after ${TIMEOUT / 1000}s`));
    });
  });
}
