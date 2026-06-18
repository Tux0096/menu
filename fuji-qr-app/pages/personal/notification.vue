<template>
  <div class="page-content">
    <div class="page-notification">
      <template v-if="!notificationItems">
        Загрузка...
      </template>
      <template v-else>
        <div
          v-for="itemByDay in itemsByDay"
          :key="itemByDay.date"
          class="notification-group"
        >
          <div class="notification-group__title">
            <div class="notification-item__date">
              {{ itemByDay.date }}
            </div>
          </div>
          <div class="notification-group__list notification-list">
            <div
              v-for="item in itemByDay.items"
              :key="item.createdA"
              class="notification-list__item notification-item"
            >
              <div class="notification-item__inner">
                <div class="notification-item__title">
                  {{ item.title }}
                </div>
                <div class="notification-item__body">
                  {{ item.body }}
                </div>
              </div>

              <div class="notification-item__footer">
                <div class="notification-item__time">
                  {{ item.formattedTime }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PageNotification',
  data() {
    return {
      items: [],
      fetchInterval: null,
    };
  },
  computed: {
    itemsByDay() {
      const itemsWithTimestamp = this.notificationItems.map((item) => {
        const date = new Date(item.createdAt);
        const timestamp = date.getTime();
        const formattedTime = date.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        });

        return {
          ...item,
          timestamp,
          formattedTime,
        };
      });

      const groupedItems = itemsWithTimestamp.reduce((acc, item) => {
        const date = item.createdAt.split('T')[0];

        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(item);
        return acc;
      }, {});

      return Object.keys(groupedItems)
        .map((date) => {
          const formattedDate = new Date(date).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
          });
          return {
            date: formattedDate,
            items: groupedItems[date],
          };
        });
    },
    notificationItems() {
      const notifications = this.$store.getters['notification/notifications'];
      if (notifications.items?.items?.length === 0) {
        return null;
      }
      return notifications.items;
    },
  },
  mounted() {
    this.$store.commit('notification/setLastCheckDateNotification', new Date());
  },

};
</script>

<style lang="scss" scoped>
.page-notification {
  display: flex;
  flex-direction: column;
  gap: extClamp(12);
}

.notification-group {
  display: flex;
  flex-direction: column;
  gap: extClamp(8);

  // .notification-group__title
  &__title {

    font-size: extClamp(12);
    font-weight: 400;
    line-height: 140%;
    text-align: center;
    color: #d0d0d0;
  }

  // .notification-group__list
  &__list {
    display: flex;
    flex-direction: column;
    gap: extClamp(8);
  }
}

.notification-list {

  // .notification-list__item
  &__item {
  }
}

.notification-item {
  font-size: extClamp(10);
  font-weight: 400;
  font-style: normal;
  line-height: 120%;
  display: flex;
  align-items: flex-end;
  padding: extClamp(12);
  color: var(---Main-Black, #292929);
  border-radius: 20px;
  background: #f6f6f6;

  gap: extClamp(16);

  // .notification-item__inner
  &__inner {
    display: flex;
    flex-direction: column;
    gap: extClamp(10);
  }

  // .notification-item__title
  &__title {

  }

  // .notification-item__body
  &__body {

  }

  // .notification-item__footer
  &__footer {
    display: flex;
  }

  // .notification-item__date
  &__date {
    font-size: extClamp(10);
    font-weight: 400;
    font-style: normal;
    line-height: 120%;
    text-align: center;
    color: var(---Primary-Gray, #969696);
  }

  // .notification-item__time
  &__time {
    font-size: extClamp(10);
    font-weight: 400;
    line-height: 120%;
    color: var(---Primary-Gray, #969696);
  }
}
</style>
