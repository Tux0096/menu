<template>
  <div class="user-edit-form">
    <div class="user-edit-form__inner">
      <div class="user-edit-form__item">
        <BaseInput
          v-model="name"
          placeholder="Укажите ваше имя"
        />
      </div>
      <div class="user-edit-form__item">
        <BaseInput
          v-model="email"
          placeholder="Укажите свой E-mail"
          type="email"
        />
      </div>

      <div class="user-edit-form__item">
        <BaseSelect
          v-model="gender"
          :items="genders"
          placeholder="Выберите пол"
          track-by="id"
        />
      </div>

      <div class="user-edit-form__item">
        <BaseInput
          v-model="birthday"
          :has-date-mask="true"
          placeholder="Дата рождения: __.__.____"
        />
        <input
          v-show="false"
          v-model="birthday"
          v-mask="'##.##.####'"
          type="text"
        >
      </div>

      <div class="user-edit-form__footer">
        <BaseButton
          class="user-edit-form__send-button"
          @click="save"
        >
          Изменить
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script>
const formatDate = (date) => {
  const day = date
    .getDate()
    .toString()
    .padStart(2, '0');
  const month = (date.getMonth() + 1)
    .toString()
    .padStart(2, '0');
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
};
const formatApiDate = (dateParam) => {
  const [dayParam, monthParam, yearParam] = dateParam.split('.')
    .map(Number);

  if (Number.isNaN(dayParam) || Number.isNaN(monthParam) || Number.isNaN(yearParam)) {
    throw new Error('Invalid Date Format');
  }

  const date = new Date(yearParam, monthParam - 1, dayParam);
  const day = date
    .getDate()
    .toString()
    .padStart(2, '0');
  const month = (date.getMonth() + 1)
    .toString()
    .padStart(2, '0');
  const year = date.getFullYear();

  return `${year}-${month}-${day}`;
};
export default {
  name: 'UserEditForm',

  data() {
    return {
      name: '',
      email: '',
      gender: null,
      birthday: '',

      genders: [
        { id: 'male', name: 'Мужской' },
        { id: 'female', name: 'Женский' },

      ],

      //
      isLoading: false,
    };
  },
  computed: {},
  created() {
    const user = this.$store.getters['user/user'];
    this.name = user.name;
    this.email = user.email;
    this.gender = this.genders.find((item) => item.id === user.gender) || null;

    if (user.birthday) {
      this.birthday = formatDate(new Date(user.birthday));
    }
  },
  methods: {

    close() {
      this.$emit('close');
    },

    async save() {
      const updateDate = {
        name: this.name,
        email: this.email,
        gender: this.gender.id,
        birthday: formatApiDate(this.birthday),
      };
      this.isLoading = true;
      try {
        await this.$store.dispatch('user/updateUser', updateDate);
        this.$notify({
          group: 'messages',
          type: 'success',
          text: 'Информация сохранена',
        });
        this.$store.commit('modal/hideModal');
      } catch (e) {
        console.log(e);
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>
<style lang="scss"
       scoped
>
.user-edit-form {
  display: flex;
  flex-direction: column;
  gap: extClamp(10);

  @media screen and (min-width: 768px) {
    gap: 20px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .user-edit-form__header
  &__header {
  }

  // .user-edit-form__title
  &__title {
    font-size: extClamp(12);
    font-weight: 400;
    font-style: normal;
    line-height: normal;
    color: #292929;

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .user-edit-form__inner
  &__inner {
    display: flex;
    flex-direction: column;
    gap: extClamp(12);

    @media screen and (min-width: 768px) {
      gap: 20px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .user-edit-form__item
  &__item {

  }

  // .user-edit-form__footer
  &__footer {
    display: flex;
    align-items: center;
    flex-direction: column;
    margin-top: extClamp(6);
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      margin-top: 20px;
      gap: 20px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .user-edit-form__send-button
  &__send-button {
    width: 100%;
  }

}
</style>
