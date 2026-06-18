import axios from 'axios';

const LEGACY_API = process.env.LEGACY_API_URL || 'https://apiv2.infra-fuji.ru';

/** Каталог с prod API (полные данные, картинки, стоп-лист). */
export async function fetchLegacyCatalog(deliveryTerminalId) {
  if (!deliveryTerminalId) {
    return { products: [], groups: [], stopList: [] };
  }
  const { data } = await axios.get(`${LEGACY_API}/api/v1/catalog`, {
    params: { deliveryTerminalId },
    timeout: 30000,
  });
  return data;
}

export async function fetchLegacySettings() {
  const { data } = await axios.get(`${LEGACY_API}/api/v1/setting`, { timeout: 30000 });
  return data;
}
