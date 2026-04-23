/**
 * Модуль: terminalService.js
 * Описание: Работа с терминалами (поиск по zoneId, terminalGroupId, получение всех терминалов)
 */

// ==================== Данные ====================

const terminalsData = [
  {
    name: 'Д.Донского, 12 Кудряшов',
    terminalGroupId: 'f3939516-74c8-4f71-8d94-0835e1fe61a6',
    organizationId: 'dc39c235-039e-42fd-8c12-5c98c3708386',
    terminalId: '86cb7232-8e5f-b1e7-0194-0bdddcde2d8b',
  },
  {
    name: 'Димитр 131 Скворцов Михаил В',
    terminalGroupId: 'cdf24412-9218-4ce3-adb2-d356a399eba3',
    organizationId: 'a32c40bc-2e47-4c78-88ff-5f86a35bb4c5',
    terminalId: 'e4398867-351e-a3cf-018b-999f0db7ba99',
  },
  {
    name: 'Димитр. 110 Люликова',
    terminalGroupId: 'a6ce0b4b-2a2d-494a-abf9-6f230f9ef59f',
    organizationId: '077264e3-1357-46bd-9e9a-117ce8339c31',
    terminalId: 'e4398867-351e-a3cf-018b-99ac15ff8891',
  },
  {
    name: 'Долотный, 9(116) Панарин',
    terminalGroupId: '1e35e5f8-d228-4d89-a43b-291a3440d501',
    organizationId: '74ba1c9e-a301-4155-8a74-78e44eb7e9cc',
    terminalId: 'e4398867-351e-a3cf-018b-9a1eddb684ff',
  },
  {
    name: 'Дыбенко 120',
    terminalGroupId: 'ac20692d-f898-43e5-89c5-fd18d9a75a76',
    organizationId: '9f6e6552-9722-409b-b20f-32bcfc31d448',
    terminalId: '03b7bb78-8b54-309e-018c-6e559007c401',
  },
  {
    name: 'Коммунист.27 Исаева Н.А',
    terminalGroupId: 'e5eb2729-44fd-4505-bc0e-6610613f962c',
    organizationId: '26823617-16aa-4276-8d73-505afd052eac',
    terminalId: 'e4398867-351e-a3cf-018b-99d17a6e1ae7',
  },
  {
    name: 'Крутые Ключи Панарин',
    terminalGroupId: '08c52b2a-e47b-4027-a195-d4a873a3b69c',
    organizationId: '50e39e73-d9d6-4753-bd9c-8f3a67a4dc66',
    terminalId: 'e4398867-351e-a3cf-018b-99b59dc715c0',
  },
  {
    name: 'Ленинградск. 60 Рожков',
    terminalGroupId: 'fd6eb762-1baf-40a4-81cb-0bf895ad7c01',
    organizationId: '7b45efba-0c64-448a-8297-279f569ed25e',
    terminalId: 'e4398867-351e-a3cf-018b-99dea3d09c51',
  },
  {
    name: 'Лукачева 6 Сафонов В А',
    terminalGroupId: '8408560c-773a-452b-9977-d25371d558c6',
    organizationId: 'f392fdde-ef15-41da-89c2-6340edf43209',
    terminalId: 'e4398867-351e-a3cf-018b-99c22b2eaa74',
  },
  {
    name: 'Молодогв. 135 Лиховайда',
    terminalGroupId: '4dca79a4-9692-4de1-b759-33f0c1eff024',
    organizationId: 'e41e1748-718b-41c6-8290-c7a27dced0b0',
    terminalId: '02c55e58-bb32-cd42-0191-d75358a3d880',
  },
  {
    name: 'Николаевск 38 Кудряшов',
    terminalGroupId: 'eb5d0016-df87-4270-9152-e31be810ecd9',
    organizationId: 'cb34491b-b6d0-45a3-b796-414c6936c6ba',
    terminalId: 'e4398867-351e-a3cf-018b-9a46b91c9817',
  },
  {
    name: 'Новокуйб. Ковалкин',
    terminalGroupId: '9882a672-223b-423a-81dd-84e70dfb1148',
    organizationId: 'f34b9267-8914-4a67-a97e-9711dc1a8133',
    terminalId: 'e4398867-351e-a3cf-018b-9a18976524b2',
  },
  {
    name: 'Ново-Садов. 24 Головин',
    terminalGroupId: '045e3232-3551-47ec-b3c6-a0656a027e8b',
    organizationId: 'c1d51d6c-738f-410d-a92b-34c7d631c592',
    terminalId: 'e4398867-351e-a3cf-018b-998cb7a874f2',
  },
  {
    name: 'Осетинская 12 Прохорова',
    terminalGroupId: '9ee9a605-d640-42f7-9841-54635fa830d6',
    organizationId: 'bc9016eb-7c02-46ed-9670-fbc21c4c3c8c',
    terminalId: 'af03ac3e-dee5-f415-0181-0524010d81aa',
  },
  {
    name: 'Просека 163 Кривотулова',
    terminalGroupId: '4af9bebc-2bbb-4885-80c5-576f7e74a8f9',
    organizationId: 'cef32475-d4e3-4f00-b32f-a921d3dee6dd',
    terminalId: 'e4398867-351e-a3cf-018b-9a039dc8d7a4',
  },
  {
    name: 'Революц. 70 Скворцов',
    terminalGroupId: '76db10ad-c766-4ef9-bcb2-738f2dca54ce',
    organizationId: '37410497-8db8-4245-8b0c-199b1ef30dac',
    terminalId: 'e4398867-351e-a3cf-018b-998cb7a8c4af',
  },
  {
    name: 'Сергей Лазо 24 Крохмалев',
    terminalGroupId: '7d7ec3aa-bfde-42a0-8faf-c143e8bb9f75',
    organizationId: '28690e24-26aa-4228-be55-db0700c47666',
    terminalId: '286727a0-d3ce-ff71-017d-be261a029fef',
  },
  {
    name: 'Тольятти Автостроителей 56 Сайгина',
    terminalGroupId: 'fe6a66ab-600d-4034-a698-53bd7c6aa8e8',
    organizationId: '674eedf3-5088-4529-8e97-bce1f110603d',
    terminalId: 'e4398867-351e-a3cf-018b-991bff29d5bf',
  },
  {
    name: 'Тольятти Карла Маркса 76 Сайгина',
    terminalGroupId: '6957950d-99e2-424d-8f03-332e000b9279',
    organizationId: '6811b98c-eadc-4b1d-bada-3d981bf0231c',
    terminalId: 'e4398867-351e-a3cf-018b-9a2782ec56bf',
  },
  {
    name: 'Физкультурная 98 Иконникова',
    terminalGroupId: 'f4ad9b9a-2c72-43ac-84e6-a2070ee89eef',
    organizationId: '5f3c8a7b-b60c-4e22-b603-d8b14650df58',
    terminalId: 'e4398867-351e-a3cf-018b-9983526f1169',
  },
  // с этого терминала загрузка номенклатуры
  // {
  //   name: 'КЦ Головин',
  //   terminalGroupId: '974a2bdc-e8fe-4a7a-8edd-2d5015a2ed0e',
  //   organizationId: '05b015ec-87d0-4f5a-a7d1-3eecfe2c4fc2',
  //   terminalId: 'c1c46e8a-9ed0-8b1d-0170-0c0b42e79b88',
  // },
  {
    name: 'Старо загора 124',
    terminalGroupId: '2f1a5c1e-c6a2-4602-8025-77446da3925b',
    organizationId: 'b5bb5b34-8e94-4781-a209-5077577f5dde',
    terminalId: '04d22af9-0b31-947f-0195-b7921697b0f6',
  },
  {
    name: 'Старо загора 60',
    terminalGroupId: 'f719f0dd-a9a1-4d1f-94d4-3b5dbb90d148',
    organizationId: '3f1ec505-bfc2-46af-bc93-a88601146a32',
    terminalId: '03f01e01-26dc-73e6-018d-7ac47578bb26',
  },
  {
    name: 'Тольятти Льва Яшина 16 Головин',
    terminalGroupId: 'd1c2cb7e-99ca-4893-9e0d-27ab931912dd',
    organizationId: 'b2a635b1-5409-4679-86f1-f28f6e220338',
    terminalId: 'd1c2cb7e-99ca-4893-9e0d-27ab931912dd',
  },
];

// ==================== Публичный API ====================

export function getTerminalById(terminalId) {
  if (!terminalId) return null;
  const terminal = terminalsData.find((item) => item.terminalId === terminalId);
  return terminal ?? null;
}

export function getTerminalsAll() {
  return terminalsData;
}
