<template>
  <div
    class="auth"
  >
    <div
      v-if="step === Step.SMS"
      class="auth__inner auth__inner--state-sms"
    >
      <div class="auth__sms sms">
        <div class="sms__title">
          Ваш номер телефона
        </div>
        <div class="sms__phone">
          {{ phone }}
        </div>
        <div class="sms__subtitle">
          Код из СМС:
        </div>
        <div class="sms__fields">
          <input
            v-for="(_, idx) in fields"
            :key="`sms-field-${idx}`"
            ref="input"
            v-model.trim="fields[idx]"
            class="sms__field"
            inputmode="numeric"
            pattern="[0-9]"
            type="text"
            @input="handleInput(idx)"
            @paste="handlePaste"
            @keydown.delete="handleDelete(idx)"
          >
        </div>
        <div
          class="sms__field"
          style="display: none;"
        >
          <input
            ref="input-code"
            v-model.trim="field"
            autocomplete="one-time-code"
            class="sms__field-code"
            inputmode="numeric"
            name="sms"
            pattern="[0-9]"
            style="width: 70px;"
            type="text"
            @paste="handlePaste"
          >
        </div>
        <div
          :class="{'sms__request-code--invisible': isSmsExpired}"
          class="sms__request-code"
        >
          запросить код повторно через

          <AppDownCounter
            :expire-at="(Date.now() + expireAtSeconds * 1000)"
            class="sms__counter"
            @timer-ended="handleTimerEnded"
          >
            <template #default="{ minutes, seconds }">
              {{ minutes }} {{ pluralizeMinutes(minutes) }} {{ seconds }} {{ pluralizeSeconds(seconds) }}
            </template>
          </AppDownCounter>
        </div>
        <div class="sms__actions">
          <BaseButton
            v-if="!isSmsExpired"
            :class="{'disable': isRequestPending || !isVerifySmsCodeButtonVisible}"
            class="auth__btn"
            @click="verifySmsCode"
          >
            Войти
          </BaseButton>
          <BaseButton
            v-else
            class="auth__btn"
            @click="onAuthButtonClick"
          >
            Запросить код повторно
          </BaseButton>
          <div class="sms__agree sms-agree">
            <div class="sms-agree__text">
              Нажимая на кнопку «Войти» вы соглашаетесь на нижеперечисленное:
            </div>

            <div class="sms-agree__more">
              <BaseCheckbox v-model="personalData">
                Я даю согласие на
                <NuxtLink to="/rule">
                  обработку своих персональных данных
                </NuxtLink>
              </BaseCheckbox>
              <BaseCheckbox v-model="receiveAdvertisingInformation">
                Я даю согласие на получение
                <NuxtLink to="/receive-advertising-information">
                  рекламной информации
                </NuxtLink>
              </BaseCheckbox>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="step === Step.PHONE"
      class="auth__inner auth__inner--state-phone"
    >
      <div class="auth__title">
        Авторизуйтесь
      </div>

      <div class="auth__line" />

      <BaseInput
        v-model.trim="name"
        class="auth__item"
        placeholder="Введите ваше имя"
      />
      <BaseInput
        v-model.trim="phone"
        :has-phone-mask="true"
        class="auth__item"
        inputmode="numeric"
        placeholder="+7 (___) ___-__-__"
      />
      <BaseButton
        :class="{
          'auth-button--is-loaded': isRequestPending,
          'disable': !PUSHNotifications
        }"
        class="auth__item auth__item--button auth-button"
        @click="onAuthButtonClick"
      >
        <template v-if="isRequestPending">
          <img
            alt=""
            class="auth__icon"
            src="~/assets/images/icons/svg/spinner.svg"
          >
        </template>
        <template v-else>
          Авторизоваться
        </template>
      </BaseButton>
      <div class="sms__agree sms-agree">
        <div class="sms-agree__more">
          <BaseCheckbox v-model="PUSHNotifications">
            Даю согласие на получение
            <NuxtLink to="/push-notifications-rules">
              сервисных SMS и Push-уведомлений
            </NuxtLink>
          </BaseCheckbox>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">

import { defineComponent } from 'vue';
import { normalizePhone, validatePhone, pluralize } from '~/lib/common';
import * as smsService from '~/modules/sms/sms.service';

enum Step {
  PHONE = 'phone',
  SMS = 'sms',
}

export default defineComponent({

  data() {
    return {
      name: '',
      phone: '',

      fields: ['', '', '', ''],
      // ввел field это поле, потому что в некоторых браузерах не работает автозаполнение
      // когда код разбит на отдельные поля
      field: '',

      step: Step.PHONE as Step,

      expireAt: 0,
      expireAtSeconds: 0,

      isRequestPending: false,

      token: null,

      personalData: true,
      PUSHNotifications: true,
      receiveAdvertisingInformation: true,
      /// /
      Step,
    };
  },
  computed: {
    isSmsExpired() {
      return this.expireAt <= 0;
    },
    isVerifySmsCodeButtonVisible() {
      return this.personalData;
    },
    isAuthButtonVisible() {
      return this.PUSHNotifications;
    },
  },
  watch: {
    fields(value) {
      value.forEach((item: string, index: number) => {
        if (item.length > 1) {
          this.fields[index] = item[1];
        }

        this.field = this.fields.join('');
      });
    },
    field(val: string) {
      if (this.field.length > 4) {
        this.field = val.slice(0, 4);
      }
      this.fields.fill('');

      this.field
        .split('')
        .forEach((item: string, index: number) => {
          this.fields[index] = item;
        });
    },

    step: {
      handler(val: Step) {
        const { modalInstance } = this.$store.state.modal;

        switch (val) {
          case Step.SMS:
            this.$nextTick(() => {
              modalInstance.iconData = '';
            });
            break;
          case Step.PHONE:
          default:
            this.$nextTick(() => {
              modalInstance.iconData = 'auth';
            });

            break;
        }
      },
      immediate: true,
    },

  },
  beforeMount() {
    const { modalInstance } = this.$store.state.modal;
    modalInstance.iconData = '';
  },
  async mounted() {
    if ('OTPCredential' in window) {
      try {
        const ac = new AbortController();
        const otp: any = await navigator.credentials
          .get({
            otp: { transport: ['sms'] },
            signal: ac.signal,
          } as CredentialRequestOptions);

        this.pasteCode(otp.code);
        this.$forceUpdate();
      } catch (e) {
        console.log(e);
      }
    } else {
      console.log('OTPCredential is not supported');
    }
  },

  methods: {
    validateForm(): string[] {
      const errors = [];
      if (!this.name?.trim().length) {
        errors.push('Введите имя');
      }

      if (!this.phone?.trim().length) {
        errors.push('Введите номер телефона');
      } else {
        const normalizedPhone = normalizePhone(this.phone);

        if (!validatePhone(normalizedPhone)) {
          errors.push('Неверный формат телефона');
        }
      }

      return errors;
    },
    async verifySmsCode(): Promise<void> {
      const code: string = this.field;
      if (code.length < 4) {
        this.$notify({
          group: 'messages',
          type: 'error',
          text: 'Введите код из смс сообщения',
        });
        return;
      }

      const phoneErrors = this.validateForm();
      if (phoneErrors.length > 0) {
        this.$notify({
          group: 'messages',
          type: 'error',
          text: phoneErrors.join('<br>'),
        });
        return;
      }

      try {
        const res = await smsService.verifySms(this.phone, code);
        this.token = res.token;
        await this.auth();
      } catch (error) {
        this.$notify({
          group: 'messages',
          type: 'error',
          text: error.message,
        });
      }
    },
    async requestSmsCode(): Promise<void> {
      try {
        const res: any = await smsService.sendSms(this.phone);

        // если сразу пришел токен, то авторизуем без смс
        if (res.token) {
          this.token = res.token;
          await this.auth();
        } else {
          this.expireAt = res.expireAt;
          this.expireAtSeconds = res.expireAtSeconds;
          this.step = Step.SMS;
          this.$nextTick(() => this.$refs.input[0]?.focus());
        }
      } catch (error) {
        this.$notify({
          group: 'messages',
          type: 'error',
          text: error.message,
          duration: 3000,
        });
      } finally {
        this.isRequestPending = false;
      }
    },
    async onAuthButtonClick() {
      if (this.isRequestPending) {
        return;
      }

      const phoneErrors = this.validateForm();
      if (phoneErrors.length > 0) {
        this.$notify({
          group: 'messages',
          type: 'error',
          text: phoneErrors.join('<br>'),
        });
        return;
      }

      this.isRequestPending = true;
      if (this.$store.getters['setting/IS_WITHOUT_CAPTCHA']) {
        await this.requestSmsCode();
      } else {
        this.$executeYandexCaptcha(async () => {
          await this.requestSmsCode();
        });
      }
    },

    async auth(): Promise<void> {
      const user = {
        phone: this.phone,
        name: this.name,
        personalData: this.personalData,
        PUSHNotifications: this.PUSHNotifications,
        receiveAdvertisingInformation: this.receiveAdvertisingInformation,

      };
      this.$store.commit('auth/setAuthToken', this.token);
      await this.$store.dispatch('user/auth', user);

      const isAuth = this.$store.getters['user/isAuth'];

      if (isAuth) {
        this.$store.commit('modal/hideModal', 'auth');
      }
    },
    handleTimerEnded() {
      this.expireAt = 0;
    },
    pluralizeMinutes(minutes) {
      return pluralize(minutes, 'минуту', 'минуты', 'минут');
    },
    pluralizeSeconds(seconds) {
      return pluralize(seconds, 'секунду', 'секунды', 'секунд');
    },
    handleInput(index: number) {
      if (this.fields[index].length > 0 && index < this.fields.length - 1) {
        this.$refs.input[index + 1].focus();
      }
    },
    handleDelete(index: number) {
      if (this.fields[index].length === 0 && index > 0) {
        this.$refs.input[index - 1].focus();
      }
    },
    handlePaste(e: ClipboardEvent) {
      const pastedData = e.clipboardData;
      const text = pastedData ? pastedData.getData('text') : '';
      this.pasteCode(text);
    },
    pasteCode(text: string) {
      this.$refs['input-code']?.focus();
      this.field = text;
    },

  },
});
</script>

<style lang="scss"
       scoped
>
.auth {

  @media screen and (min-width: 768px) {

  }

  @media screen and (min-width: 1280px) {

  }

  // .auth__inner
  &__inner {
    display: flex;
    flex-direction: column;
    gap: extClamp(12);

    @media screen and (min-width: 768px) {
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {
      gap: 10px;
    }
  }

  // .auth__title
  &__title {
    font-size: extClamp(16);
    font-weight: 500;
    font-style: normal;
    line-height: 120%;
    text-align: center;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 24px;
      font-weight: 600;
    }

    @media screen and (min-width: 1280px) {
      font-size: 24px;

    }
  }

  // .auth__line
  &__line {
    width: 100%;
    height: 1px;
    background: var(---Secondary-FooterLightGray, #f6f6f6);
  }

  // .auth__item
  &__item {

    // .auth__item--button
    &--button.button {
      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        margin-top: 6px;
      }
    }
  }

  // .auth__icon
  &__icon {
    width: extClamp(38);
    height: extClamp(38);
  }

  // .auth__sms
  &__sms {
  }
}

.sms {
  // .sms__title
  &__title {
    font-size: extClamp(10);
    font-weight: 500;
    line-height: 120%;
    text-align: center;
    color: var(---Primary-Gray, #969696);

    @media screen and (min-width: 768px) {
      font-size: 14px;
      line-height: 100%;
    }

    @media screen and (min-width: 1280px) {
      font-size: 14px;
    }
  }

  // .sms__phone
  &__phone {
    font-size: extClamp(16);
    font-weight: 500;
    line-height: 120%;
    margin-top: extClamp(8);
    text-align: center;
    color: var(---Main-Purple, #993ca6);

    @media screen and (min-width: 768px) {
      font-size: 20px;
      margin-top: 10px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 20px;
      margin-top: 16px;
    }

  }

  // .sms__subtitle
  &__subtitle {
    font-size: extClamp(10);
    font-weight: 500;
    line-height: 120%;
    margin-top: extClamp(12);
    text-align: center;
    color: var(---Primary-Gray, #969696);

    @media screen and (min-width: 768px) {
      font-size: 14px;
      line-height: 100%;
      margin-top: 16px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      margin-top: 14px;
    }
  }

  // .sms__fields
  &__fields {
    display: flex;
    justify-content: center;
    margin-top: extClamp(12);
    gap: extClamp(12);

    @media screen and (min-width: 768px) {
      margin-top: 16px;
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {
      justify-content: center;
      gap: 16px;
    }

  }

  // .sms__field
  &__field {

    font-size: extClamp(24);
    font-weight: 500;
    line-height: 140%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: extClamp(57);
    height: extClamp(64);
    text-align: center;
    color: var(---Main-Purple, #993ca6);
    border: 1px solid #e8e8e8;
    border-radius: extClamp(10);
    outline: none;

    @media screen and (min-width: 768px) {
      font-size: 32px;
      line-height: 120%;
      width: 80px;
      height: 80px;
      text-align: center;
      border-radius: 16px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 32px;
      width: 140px;
      height: 80px;
      border-radius: 10px;
    }

  }

  // .sms__request-code
  &__request-code {
    font-size: extClamp(10);
    font-weight: 500;
    font-style: normal;
    line-height: 120%;
    margin-top: extClamp(12);
    text-align: center;
    color: var(---Primary-Gray, #969696);

    @media screen and (min-width: 768px) {
      font-size: 14px;
      line-height: 100%;
      margin-top: 16px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 14px;
      margin-top: 16px;
    }

    // .sms__request-code--invisible
    &--invisible {
      opacity: 0;
    }
  }

  // .sms__counter
  &__counter {
    color: var(---Main-Purple, #993ca6);

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      font-weight: 400;
    }
  }

  // .sms__actions
  &__actions {
    display: flex;
    align-items: center;
    flex-direction: column;
    margin-top: extClamp(12);

    @media screen and (min-width: 768px) {
      margin-top: 16px;
    }

    @media screen and (min-width: 1280px) {
      margin-top: 16px;
    }
  }

  // .auth__btn
  &::v-deep .auth__btn {
    width: 100%;
  }

  // .sms__agree
  &__agree {
    margin-top: extClamp(8);

    @media screen and (min-width: 768px) {
      font-size: 14px;
      font-weight: 500;
      line-height: 100%;
      width: 100%;
      margin-top: 0;
    }

    @media screen and (min-width: 1280px) {
      font-size: 14px;
      line-height: 140%;
    }

    > a {
      color: #993ca6;
    }
  }
}

.auth-button {
  height: extClamp(42);

  // .auth-button--is-loaded
  &--is-loaded {
    padding-top: 0;
    padding-bottom: 0;
  }
}

.sms-agree {
  // .sms-agree__text
  &__text {
    font-size: extClamp(9);
    font-weight: 400;
    line-height: 120%;
    text-align: center;
    color: var(---Primary-Gray, #969696);

    @media screen and (min-width: 768px) {
      font-size: 12px;
      margin-top: 8px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .sms-agree__more
  &__more {
    display: flex;
    flex-direction: column;
    margin-top: extClamp(12);
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      margin-top: 16px;
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {
      margin-top: 6px;
    }

    &::v-deep .base-checkbox__name {
      font-size: extClamp(10);
      font-weight: 500;
      line-height: 120%;
      margin-top: extClamp(0);
      text-align: left;
      color: var(---Primary-Gray, #969696);

      @media screen and (min-width: 768px) {
        font-size: 14px;
        line-height: normal;
      }

      @media screen and (min-width: 1280px) {
        font-size: 14px;
        font-weight: 500;
        line-height: 100%;
      }

      > a {
        color: #993ca6;
      }
    }

  }
}

.disable {
  pointer-events: none !important;
  border-color: #ccc !important;
  background-color: #ccc !important;
}
</style>
