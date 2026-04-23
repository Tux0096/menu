import axios from 'axios';

let catalogVersion = null;

async function fetchCatalogVersion() {
  try {
    const { data } = await axios.get(`${process.env.FRONT_API_URL}/api/v1/storage/version`);
    catalogVersion = data;
  } catch (error) {
    console.error('Ошибка при получении версии каталога:', error);
  }
}

fetchCatalogVersion()
  .then();

// Обновляем версию каталога периодически
setInterval(fetchCatalogVersion, 60 * 1000);

export default function (req, res, next) {
  req.catalogVersion = catalogVersion || 'default';
  next();
}
