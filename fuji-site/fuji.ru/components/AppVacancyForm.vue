<template>
  <div class="vacancies-form">
    <div class="vacancies-form__header">
      <div class="vacancies-form__title">
        Заполните анкету
      </div>
    </div>
    <div class="vacancies-form__line" />
    <div class="vacancies-form__inner">
      <div class="vacancies-form__item">
        <BaseInput
          v-model="fio"
          placeholder="Введите ваше ФИО"
        />
      </div>
      <div class="vacancies-form__item">
        <BaseInput
          v-model="phone"
          :has-phone-mask="true"
          placeholder="Ваш номер телефона"
        />
      </div>

      <div class="vacancies-form__item">
        <BaseSelect
          v-model="vacancy"
          :items="vacancies"
          placeholder="Желаемая должность"
        />
      </div>

      <div class="vacancies-form__footer">
        <BaseButton
          class="vacancies-form__send-button"
          @click="onSend"
        >
          Оставить заявку
        </BaseButton>
        <div class="vacancies-form__agree">
          Нажимая на кнопку, я соглашаюсь с
          <NuxtLink to="/rule">
            Условиями обработки персональных данных.
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'AppVacancyForm',
  components: {},

  data() {
    return {
      fio: '',
      phone: '',
      vacancy: null,

      vacancies: [
        { id: 1, name: 'Повар' },
        { id: 2, name: 'Официант' },
        { id: 3, name: 'Администратор' },
        { id: 4, name: 'Курьер (с личным авто)' },
        { id: 5, name: 'Оператор' },
        { id: 6, name: 'Клинер' },
        { id: 7, name: 'Оператор колл-центра' },
        { id: 8, name: 'Кассир' },
      ],

      //
      isLoading: false,
    };
  },
  computed: {},
  methods: {

    close() {
      this.$emit('close');
    },

    async sendVacancy(token) {
      try {
        this.isLoading = true;

        await this.$axios.post(`${this.$config.FRONT_API_URL}/api/v1/form/vacancy`, {
          fio: this.fio,
          phone: this.phone,
          vacancies: this.vacancy.name,
        }, {
          params: {
            token,
            type: 'yandex',
          },
        });

        this.$emit('send');
      } catch (e) {
        console.log(e);
      } finally {
        this.isLoading = false;
      }
    },

    async onSend() {
      if (!this.fio?.length || !this.phone?.length || !this.vacancy?.name?.length) {
        this.$notify({
          group: 'messages',
          type: 'error',
          text: 'Все поля должны быть заполнены',
        });
        return;
      }

      if (this.$store.getters['setting/IS_WITHOUT_CAPTCHA']) {
        await this.sendVacancy(null);
      } else {
        this.$executeYandexCaptcha(async (token) => {
          await this.sendVacancy(token);
        });
      }
    },
  },
};
</script>
<style lang="scss"
       scoped
>
.vacancies-form {
  display: flex;
  flex-direction: column;
  padding: extClamp(24) extClamp(8);
  border-radius: extClamp(12);
  background: var(---Primary-LightGray, #f5f5f5);
  gap: extClamp(12);

  @media screen and (min-width: 768px) {
    padding: 32px 10px;
    border-radius: 16px;
    gap: 16px;
  }

  @media screen and (min-width: 1280px) {
    position: relative;
    padding: 30px 30px 90px 30px;
  }

  // .vacancies-form__header
  &__header {
  }

  // .vacancies-form__line
  &__line {
    width: 100%;
    height: 1px;
    background: var(---Extra-LightGray, #e8e8e8);

    @media screen and (min-width: 768px) {
      margin-top: 0;
      margin-bottom: 0;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .vacancies-form__title
  &__title {
    font-size: extClamp(16);
    font-weight: 500;
    line-height: 100%;
    text-align: center;

    @media screen and (min-width: 768px) {
      font-size: 20px;
      line-height: 120%;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .vacancies-form__inner
  &__inner {
    display: flex;
    flex-direction: column;
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {
      flex-direction: row;
      gap: 8px
    }
  }

  // .vacancies-form__item
  &__item {
    width: 100%;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      max-width: 300px;
    }
  }

  // .vacancies-form__footer
  &__footer {
    display: flex;
    align-items: center;
    flex-direction: column;
    margin-top: extClamp(4);
    gap: extClamp(12);

    @media screen and (min-width: 768px) {
      margin-top: 10px;
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {
      width: 100%;
      margin-top: 0;
    }
  }

  // .vacancies-form__send-button
  &__send-button {
    width: 100%;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      width: 100%;
      max-width: 315px;
      height: 43px;
      min-height: 43px !important;
      margin-left: 10px !important;
    }
  }

  // .vacancies-form__agree
  &__agree {
    font-size: extClamp(10);
    font-weight: 500;
    line-height: 120%;
    text-align: center;
    color: var(---Primary-Gray, #969696);

    @media screen and (min-width: 768px) {
      font-size: 14px;
      line-height: normal;
    }

    @media screen and (min-width: 1280px) {
      position: absolute;
      right: 0;
      bottom: 30px;
      left: 0;
      max-width: 390px;
      margin-inline: auto;
    }

    > a {
      color: var(---Main-Purple, #993ca6);
    }

  }
}
</style>
