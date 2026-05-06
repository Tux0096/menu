/**
 * Утилита: вывести список organizationId, доступных текущему IIKO_API_LOGIN.
 * Используется один раз при привязке нового ключа.
 */
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

const IIKO_URL = 'https://api-ru.iiko.services';

async function main() {
  const apiLogin = process.env.IIKO_API_LOGIN;
  if (!apiLogin) {
    console.error('IIKO_API_LOGIN не задан в .env');
    process.exit(1);
  }

  console.log('Получаем токен iiko...');
  const tokenRes = await axios.post(`${IIKO_URL}/api/1/access_token`, { apiLogin });
  const token = tokenRes.data.token;

  console.log('Запрашиваем список организаций...');
  const orgsRes = await axios.post(
    `${IIKO_URL}/api/1/organizations`,
    { returnAdditionalInfo: true, includeDisabled: false },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const orgs = orgsRes.data.organizations || [];
  console.log(`\nВсего организаций: ${orgs.length}\n`);
  for (const o of orgs) {
    console.log(`  ${o.id}  ${o.name}`);
  }

  console.log('\nЗапрашиваем терминальные группы...');
  try {
    const tgRes = await axios.post(
      `${IIKO_URL}/api/1/terminal_groups`,
      { organizationIds: orgs.map((o) => o.id), includeDisabled: false },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const groups = tgRes.data.terminalGroups || [];
    console.log(`\nТерминальные группы по организациям:`);
    for (const og of groups) {
      const orgName = orgs.find((o) => o.id === og.organizationId)?.name || og.organizationId;
      console.log(`\n  [${og.organizationId}] ${orgName}`);
      for (const tg of og.items || []) {
        console.log(`    terminalGroupId: ${tg.id}  name: ${tg.name}  address: ${tg.address || '-'}`);
      }
    }
  } catch (e) {
    console.log('Не удалось получить терминальные группы:', e.response?.data || e.message);
  }
}

main().catch((e) => {
  console.error('Ошибка:', e.response?.data || e.message);
  process.exit(1);
});
