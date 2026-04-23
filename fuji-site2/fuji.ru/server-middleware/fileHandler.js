import axios from 'axios';
import { pipeline } from 'stream';
import { promisify } from 'util';
import dotenv from 'dotenv';
import connect from 'connect';

dotenv.config();

const pump = promisify(pipeline);

async function handlePdfRequest(fileName, req, res) {
  try {
    const apiUrl = `${process.env.FRONT_API_URL}/api/v1/file/${fileName}.pdf`;

    const response = await axios({
      url: apiUrl,
      method: 'GET',
      responseType: 'stream',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${fileName}.pdf`);

    await pump(response.data, res);
  } catch (error) {
    console.error(`Ошибка при запросе файла ${fileName}.pdf:`, error);
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      statusCode: 404,
      message: `Ошибка при загрузке файла ${fileName}.pdf`,
    }));
  }
}

const app = connect();

app.use('/menu.pdf', (req, res, next) => {
  handlePdfRequest('menu', req, res)
    .then(() => {});
});

app.use('/menumobile.pdf', (req, res, next) => {
  handlePdfRequest('menumobile', req, res)
    .then(() => {});
});

app.use('/menubar.pdf', (req, res, next) => {
  handlePdfRequest('menubar', req, res)
    .then(() => {});
});

export default app;
