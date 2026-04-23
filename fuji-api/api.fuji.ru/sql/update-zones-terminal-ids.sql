-- =====================================================
-- Скрипт обновления terminal_id в зонах доставки
-- Дата: 2025-11-06
-- Описание: Актуализация terminal_id зон на основе данных из iiko
-- =====================================================
-- ВАЖНО: Этот скрипт обновляет только terminal_id у существующих зон
-- Запускать на продакшене после того, как зоны уже изменены внешней системой
-- =====================================================

-- Самара - терминалы с несовпадающими ID (19 терминалов)

-- 1. Кошелев (Крутые Ключи Панарин)
UPDATE delivery_zones
SET terminal_id = 'e4398867-351e-a3cf-018b-99b59dc715c0'
WHERE terminal_id = '07b43ddc-35f2-6ede-0173-5b8200f6050f';

-- 2. Димитрова 110
UPDATE delivery_zones
SET terminal_id = 'e4398867-351e-a3cf-018b-99ac15ff8891'
WHERE terminal_id = 'c1c46e8a-9ed0-8b1d-0170-1162be5d5b30';

-- 3. Физкультурная 98
UPDATE delivery_zones
SET terminal_id = 'e4398867-351e-a3cf-018b-9983526f1169'
WHERE terminal_id = 'f871e680-9658-5c1a-0178-6da2a1bc6d71';

-- 4. Стара Загора 60
UPDATE delivery_zones
SET terminal_id = '03f01e01-26dc-73e6-018d-7ac47578bb26'
WHERE terminal_id = '2b2320e4-d56b-35b4-018a-6f4769c36f5a';

-- 5. Стара Загора 124А
UPDATE delivery_zones
SET terminal_id = '04d22af9-0b31-947f-0195-b7921697b0f6'
WHERE terminal_id = '03f01e01-26dc-73e6-018d-8d245dd44b8b';

-- 6. Ново-Садовая 24
UPDATE delivery_zones
SET terminal_id = 'e4398867-351e-a3cf-018b-998cb7a874f2'
WHERE terminal_id = 'c1c46e8a-9ed0-8b1d-0170-0c0b42e79b88';

-- 7. Коммунистическая 27
UPDATE delivery_zones
SET terminal_id = 'e4398867-351e-a3cf-018b-99d17a6e1ae7'
WHERE terminal_id = '1370506c-ca56-58d7-016f-f7f997d02859';

-- 8. Молодогвардейская 135
UPDATE delivery_zones
SET terminal_id = '02c55e58-bb32-cd42-0191-d75358a3d880'
WHERE terminal_id = 'c1c46e8a-9ed0-8b1d-0170-1162be5d5a14';

-- 9. Кирова (Димитрова 131)
UPDATE delivery_zones
SET terminal_id = 'e4398867-351e-a3cf-018b-999f0db7ba99'
WHERE terminal_id = '98ee89fd-c600-ea62-017a-cdafb9b24a2f';

-- 10. Долотный 9
UPDATE delivery_zones
SET terminal_id = 'e4398867-351e-a3cf-018b-9a1eddb684ff'
WHERE terminal_id = 'c1c46e8a-9ed0-8b1d-0170-1666a0749578';

-- 11. Южный Город (Николаевский пр. 38)
UPDATE delivery_zones
SET terminal_id = 'e4398867-351e-a3cf-018b-9a46b91c9817'
WHERE terminal_id = '07b43ddc-35f2-6ede-0173-7ffcc66b9cbf';

-- 12. Дмитрия Донского 12
UPDATE delivery_zones
SET terminal_id = '86cb7232-8e5f-b1e7-0194-0bdddcde2d8b'
WHERE terminal_id = '09e516d4-7aa6-4262-0170-521be2110b78';

-- 13. 3-й проезд (Революционная 70а)
UPDATE delivery_zones
SET terminal_id = 'e4398867-351e-a3cf-018b-998cb7a8c4af'
WHERE terminal_id = 'c2ff5aec-09aa-1d15-0166-ff752e7b054a';

-- 14. Лукачева 6
UPDATE delivery_zones
SET terminal_id = 'e4398867-351e-a3cf-018b-99c22b2eaa74'
WHERE terminal_id = 'd2166d16-a7c9-5d51-0182-211b49e3cc84';

-- 15. Ленинградская 60
UPDATE delivery_zones
SET terminal_id = 'e4398867-351e-a3cf-018b-99dea3d09c51'
WHERE terminal_id = 'c1c46e8a-9ed0-8b1d-0170-0c0b42e7a54a';

-- 16. 6-я Просека 163
UPDATE delivery_zones
SET terminal_id = 'e4398867-351e-a3cf-018b-9a039dc8d7a4'
WHERE terminal_id = '07077242-6d19-318a-0172-9e4d2c9dd7ce';

-- Новокуйбышевск

-- 17. Новокуйбышевск (Дзержинского 29)
UPDATE delivery_zones
SET terminal_id = 'e4398867-351e-a3cf-018b-9a18976524b2'
WHERE terminal_id = '2215e0d8-c489-a617-0167-32b230ba0441';

-- Тольятти

-- 18. Тольятти Карла Маркса 76
UPDATE delivery_zones
SET terminal_id = 'e4398867-351e-a3cf-018b-9a2782ec56bf'
WHERE terminal_id = '3bfafb5e-a2b8-8179-017b-9d7f2d60781d';

-- 19. Тольятти Автостроителей 56А (Аврора)
UPDATE delivery_zones
SET terminal_id = 'e4398867-351e-a3cf-018b-991bff29d5bf'
WHERE terminal_id = '70162946-4b8a-c87c-017b-158826336aef';

-- =====================================================
-- Терминалы, которые УЖЕ имеют правильные ID (не требуют обновления):
-- - Сергея Лазо 24: 286727a0-d3ce-ff71-017d-be261a029fef ✅
-- - Осетинская 12: af03ac3e-dee5-f415-0181-0524010d81aa ✅
-- - Дыбенко 120: 03b7bb78-8b54-309e-018c-6e559007c401 ✅
-- =====================================================

-- Проверка результатов обновления
-- SELECT terminal_id, COUNT(*) as zones_count
-- FROM delivery_zones
-- GROUP BY terminal_id
-- ORDER BY zones_count DESC;

