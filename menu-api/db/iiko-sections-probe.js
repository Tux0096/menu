/**
 * Разовая диагностика (только чтение): залы и столы каждой кассы для каждого ключа iiko —
 * чтобы понять, какая касса физически барная.
 *   node db/iiko-sections-probe.js
 */
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { iikoCredsList, requestIikoTokenFor } from '../lib/iiko-token.js';

const IIKO_URL = process.env.IIKO_URL || 'https://api-ru.iiko.services';

async function probe(creds) {
  const label = creds ? `iiko ${creds}` : 'iiko кухня';
  try {
    const headers = { Authorization: `Bearer ${await requestIikoTokenFor(creds)}` };
    const post = (path, body) => axios.post(`${IIKO_URL}${path}`, body, { headers, timeout: 20000 }).then((x) => x.data);
    const { organizations = [] } = await post('/api/1/organizations', { returnAdditionalInfo: false, includeDisabled: true });
    for (const o of organizations) {
      const tg = await post('/api/1/terminal_groups', { organizationIds: [o.id], includeDisabled: true });
      for (const g of tg.terminalGroups || []) {
        for (const t of g.items || []) {
          let alive = '—';
          try {
            const st = await post('/api/1/terminal_groups/is_alive', { organizationIds: [g.organizationId || o.id], terminalGroupIds: [t.id] });
            const x = (st.isAliveStatus || [])[0];
            alive = x ? (x.isAlive ? 'на связи' : 'НЕ на связи') : 'нет ответа';
          } catch (e) { alive = `ошибка ${e.response?.data?.errorDescription || e.message}`; }
          let sections = '';
          try {
            const sec = await post('/api/1/reserve/available_restaurant_sections', { terminalGroupIds: [t.id] });
            sections = (sec.restaurantSections || []).map((s) => `${s.name} (${(s.tables || []).length} ст.)`).join(', ');
          } catch (e) { sections = `ошибка ${e.response?.data?.errorDescription || e.message}`; }
          console.log(`${label}: орг «${o.name}» [${o.id}] (группа орг ${g.organizationId || '—'}) касса «${t.name}» [${t.id}] — ${alive}; залы: ${sections || 'нет'}`);
        }
      }
    }
  } catch (e) {
    console.log(`${label}: ошибка —`, e.response?.status || '', e.response?.data?.errorDescription || e.message);
  }
}

await probe('');
for (const c of iikoCredsList().filter(Boolean)) await probe(c);
