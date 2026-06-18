<template>
  <client-only>
    <div
      class="page-content"
      style="padding: 0px"
    >
      <div class="page-promocodes">
        <div class="page-promocodes__header">
          <svg
            class="back__button"
            @click="$router.push('/personal')"
          >
            <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#return-back" />
          </svg>
          <h1>Актуальные акции</h1>
        </div>
      </div>
      <div class="page-promocodes__middle">
        <template v-if="this.promocodes.length">
          <div 
            class="promocode__container"
            v-for="(promocode, index) in this.promocodes"
            :key="promocode?.config?.id || promocode?.code"
            :style="{ background: getPromocodeBackground(index) }"
            @click="openPromocode(promocode)"
          >
            <div class="promocode-info__container">
              <h1>
                <span class="description-first">
                  {{ splitPromocodeDescription(promocode?.config?.description).first }}
                </span>
                <span
                  v-if="splitPromocodeDescription(promocode?.config?.description).second"
                  class="description-second"
                >
                  {{ splitPromocodeDescription(promocode?.config?.description).second }}
                </span>
              </h1>
              <p>ПРОМОКОД: {{ promocode.code }}</p>
              <div
                class="apply__button"
                @click.stop="applyPromocode(promocode)"
              >
                Применить
              </div>
            </div>
          </div>
        </template>
        <PersonalEmptyPage
          v-else
          :bnt-callback="goToProfile"
          class="page-promocodes__empty"
        >
          <template #button-text>
            Вернуться в профиль
          </template>
          <template #icon>
            <lord-icon
              :src="`/assets/libs/icon-json/review.json`"
              class="page-promocodes__empty-icon"
              trigger="loop"
            />
          </template>
        </PersonalEmptyPage>
      </div>
    </div>
  </client-only>
</template>

<script>
export default {
  name: 'PagePromocodes',
  data() {
    return {
      isLoading: false,
      errorText: '',
      promocodes: [],
      promocodeGradients: [
        'linear-gradient(97.59deg, #E4FBAB 6.65%, #83994C 111.34%)',
        'linear-gradient(97.59deg, #ACEEFE 6.65%, #DFEBE9 61.09%, #E1C3FF 111.34%)',
        'linear-gradient(97.59deg, #FFE7B5 6.65%, #FFD0A8 61.09%, #F0A6CA 111.34%)',
        'linear-gradient(97.59deg, #C6F6D5 6.65%, #9AE6B4 61.09%, #81E6D9 111.34%)',
        'linear-gradient(97.59deg, #D6BCFA 6.65%, #BEE3F8 61.09%, #C3DAFE 111.34%)',
      ],
    };
  },
  async fetch() {
    await this.loadPromocodes();
  },
  methods: {
    getPromocodeBackground(index) {
      const list = this.promocodeGradients || [];
      if (!list.length) {
        return '#F4ECFF';
      }
      return list[index % list.length];
    },
    isActivePromocode(promocode) {
      if (!promocode) {
        return false;
      }
      return promocode.active === true || String(promocode.status || '').toLowerCase() === 'active';
    },
    async loadPromocodes() {
      this.isLoading = true;
      this.errorText = '';
      try {
        const baseUrl = this.$config.FRONT_API_URL;
        const requests = [
          this.$axios.$post(`${baseUrl}/api/v1/remarked-loyalty/promocodes/anonymous/get`, {}),
        ];
        if (this.$store.getters['user/isAuth']) {
          requests.unshift(
            this.$axios.$post(`${baseUrl}/api/v1/remarked-loyalty/promocodes/personal/get`, {}),
          );
        }

        const responses = await Promise.all(requests);
        this.promocodes = responses.flat().filter((promocode) => this.isActivePromocode(promocode));
      } catch (e) {
        this.errorText = e?.response?.data?.message || e?.message || 'Не удалось загрузить промокоды';
        this.promocodes = [];
      } finally {
        this.isLoading = false;
      }
    },
    splitPromocodeDescription(text) {
      const src = (text || '').trim();
      if (!src) {
        return { first: '', second: '' };
      }

      const words = src.split(/\s+/);
      if (words.length < 2) {
        return { first: src, second: '' };
      }

      const splitWords = ['в', 'во', 'на', 'при', 'к', 'ко', 'с', 'со', 'по', 'для', 'без'];
      let splitIndex = -1;
      for (let i = 1; i < words.length; i += 1) {
        const w = words[i].toLowerCase().replace(/[.,!?;:()]/g, '');
        if (splitWords.includes(w)) {
          splitIndex = i;
          break;
        }
      }

      if (splitIndex === -1) {
        splitIndex = Math.ceil(words.length / 2);
      }

      return {
        first: words.slice(0, splitIndex).join(' ').trim(),
        second: words.slice(splitIndex).join(' ').trim(),
      };
    },
    openPromocode(promocode) {
      const id = promocode?.config?.id || promocode?.code;
      if (!id) {
        return;
      }
      this.$router.push(`/promocodes/${id}`);
    },
    async applyPromocode(promocode) {
      const code = String(promocode?.code || '').trim();
      if (!code) {
        return;
      }
      await this.$store.dispatch('cart/setAppliedCoupon', code);
      await this.$router.push('/cart');
    },
    goToProfile() {
      this.$router.push('/personal');
    },
  },
};
</script>

<style lang="scss" scoped>
.promocode__container {
    width: 100%;
    height: extClamp(128);
    border-radius: extClamp(16);
    padding: extClamp(16);
    display: flex;
    justify-content: flex-start;
    align-items: center;

    h1 {
      color: #343E59;
      font-size: extClamp(14);
      font-weight: 600;
      font-family: 'Wix Madefor Display';
      display: flex;
      flex-direction: column;

      .description-first {
        font-weight: 600;
      }

      .description-second {
        font-weight: 400;
        font-size: extClamp(13);
        margin-top: extClamp(4);
      }
    }

    p {
      color: #343E59;
      font-size: extClamp(10);
      font-weight: 600;
      font-family: 'Wix Madefor Display';
    }

    .apply__button {
      width: extClamp(82);
      height: extClamp(26);
      border-radius: extClamp(7);
      display: flex;
      justify-content: center;
      align-items: center;
      color: #fff;
      font-size: extClamp(10);
      font-weight: 500;
      font-family: 'Wix Madefor Display';
      background-color: #993CA6;
      cursor: pointer;
    }

}

.promocode-info__container {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.page-promocodes__header {
    padding: extClamp(16);
    border-bottom: extClamp(1) solid #E8E8E8;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;

    .back__button {
        width: extClamp(24);
        height: extClamp(24);
        margin-right: auto;
    }

    h1 {
        font-size: extClamp(16);
        color: #292929;
        font-family: 'Wix Madefor Display';
        font-weight: 600;
        margin-right: auto;
    }

    @media screen and (min-width: 1280px) {
      display: none;
    }
}

.page-promocodes__middle {
    padding: extClamp(16);
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: extClamp(10);
    padding-bottom: extClamp(124);
}

.page-promocodes__empty {
  margin-top: extClamp(60);

  @media screen and (min-width: 768px) {
    margin-top: extClamp(60);
  }
}

.page-promocodes__empty-icon {
  width: extClamp(80);
  height: extClamp(80);

  @media screen and (min-width: 768px) {
    width: extClamp(140);
    height: extClamp(140);
  }
}
</style>