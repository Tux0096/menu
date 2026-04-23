<template>
  <div class="mc">
    <div class="mc__inner">

      <!-- ── Items ─────────────────────────────────────────────────── -->
      <div class="mc__items">
        <div class="mc__header">
          <button class="mc__back" @click="$router.push(`/menu/${$route.params.slug}`)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 5l-7 7 7 7" stroke="#292929" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            Назад к меню
          </button>
          <h1 class="mc__title">Корзина</h1>
        </div>

        <!-- Empty -->
        <div v-if="cartItems.length === 0" class="mc__empty">
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
            <rect width="72" height="72" rx="20" fill="#f5f5f5" />
            <path d="M22 30h28l-4 22H26L22 30z" stroke="#d0d0d0" stroke-width="2.5" stroke-linejoin="round" />
            <path d="M18 24h5l4 6M27 52l-1 4M45 52l1 4" stroke="#d0d0d0" stroke-width="2.5" stroke-linecap="round" />
          </svg>
          <p class="mc__empty-text">Корзина пуста</p>
          <button class="mc__empty-btn" @click="$router.push(`/menu/${$route.params.slug}`)">
            Перейти к меню
          </button>
        </div>

        <!-- List -->
        <div v-else class="mc__list">
          <div
            v-for="item in cartItems"
            :key="item.product.id"
            class="mc__row"
          >
            <div class="mc__row-img-wrap" @click="openModal(item.product)">
              <img
                v-if="item.product.image"
                :src="item.product.image"
                :alt="item.product.name"
                class="mc__row-img"
              />
              <div v-else class="mc__row-no-img" />
            </div>

            <div class="mc__row-info">
              <div class="mc__row-name" @click="openModal(item.product)">{{ item.product.name }}</div>
              <div v-if="item.product.weight" class="mc__row-weight">{{ item.product.weight }}</div>
            </div>

            <div class="mc__row-right">
              <div class="mc__qty">
                <button class="mc__qty-btn" @click="decrease(item.product.id)">−</button>
                <span class="mc__qty-num">{{ item.qty }}</span>
                <button class="mc__qty-btn mc__qty-btn--plus" @click="add(item.product)">+</button>
              </div>
              <div class="mc__row-total">{{ item.product.price * item.qty }}&nbsp;₽</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Summary ───────────────────────────────────────────────── -->
      <div v-if="cartItems.length > 0" class="mc__sidebar">
        <div class="mc__summary">
          <h2 class="mc__summary-title">Итого</h2>

          <div v-if="restaurant" class="mc__summary-rest">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#993ca6" />
            </svg>
            <span>{{ restaurant.address }}</span>
          </div>

          <div class="mc__summary-divider" />

          <div class="mc__summary-row">
            <span>Позиций</span>
            <span>{{ cartCount }}&nbsp;шт.</span>
          </div>

          <div class="mc__summary-divider" />

          <div class="mc__summary-total">
            <span>Итого</span>
            <span>{{ cartTotal }}&nbsp;₽</span>
          </div>

          <button
            class="mc__btn-back"
            @click="$router.push(`/menu/${$route.params.slug}`)"
          >
            Добавить ещё
          </button>

          <button class="mc__btn-clear" @click="clearCart">
            Очистить корзину
          </button>
        </div>
      </div>
    </div>

    <!-- ── Product modal ──────────────────────────────────────────── -->
    <transition name="mc-modal">
      <div v-if="modal" class="mc__overlay" @click.self="closeModal">
        <div class="mc__modal">
          <button class="mc__modal-close" @click="closeModal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#292929" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
          <div class="mc__modal-img-wrap">
            <img v-if="modal.image" :src="modal.image" :alt="modal.name" class="mc__modal-img" />
            <div v-else class="mc__modal-no-img" />
          </div>
          <div class="mc__modal-body">
            <h3 class="mc__modal-name">{{ modal.name }}</h3>
            <p v-if="modal.weight" class="mc__modal-weight">{{ modal.weight }}</p>
            <p v-if="modal.description" class="mc__modal-desc">{{ modal.description }}</p>
            <div class="mc__modal-footer">
              <span class="mc__modal-price">{{ modal.price }}&nbsp;₽</span>
              <div class="mc__qty" @click.stop>
                <button class="mc__qty-btn" @click="decrease(modal.id)">−</button>
                <span class="mc__qty-num">{{ qtyById(modal.id) }}</span>
                <button class="mc__qty-btn mc__qty-btn--plus" @click="add(modal)">+</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  name: 'MenuCart',
  layout: 'menu',

  data() {
    return { modal: null };
  },

  computed: {
    restaurant() { return this.$store.getters['menuApp/restaurant']; },
    cartItems()  { return this.$store.getters['menuApp/cartItems']; },
    cartCount()  { return this.$store.getters['menuApp/cartCount']; },
    cartTotal()  { return this.$store.getters['menuApp/cartTotal']; },
    qtyById()    { return this.$store.getters['menuApp/qtyById']; },
  },

  methods: {
    add(product) { this.$store.commit('menuApp/addItem', product); },
    decrease(id) { this.$store.commit('menuApp/decreaseItem', id); },
    clearCart()  { this.$store.commit('menuApp/clearCart'); },

    openModal(product) {
      this.modal = product;
      document.body.style.overflow = 'hidden';
    },
    closeModal() {
      this.modal = null;
      document.body.style.overflow = '';
    },
  },
};
</script>

<style lang="scss" scoped>
.mc {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 16px 120px;

  @media (min-width: 768px) { padding: 0 24px 120px; }

  &__inner {
    display: flex;
    flex-direction: column;
    gap: 32px;
    padding-top: 24px;

    @media (min-width: 1024px) {
      flex-direction: row;
      align-items: flex-start;
    }
  }

  // ── Items ────────────────────────────────────────────────────────
  &__items { flex: 1; min-width: 0; }

  &__header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }

  &__back {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    color: #969696;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    &:hover { color: #993ca6; }
  }

  &__title {
    font-size: 28px;
    font-weight: 800;
    color: #292929;

    @media (min-width: 768px) { font-size: 36px; }
  }

  // ── Empty ────────────────────────────────────────────────────────
  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 40vh;
    gap: 16px;
    text-align: center;
  }

  &__empty-text {
    font-size: 20px;
    color: #969696;
  }

  &__empty-btn {
    height: 52px;
    padding: 0 32px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    color: #993ca6;
    border: 2px solid #993ca6;
    border-radius: 100px;
    background: transparent;
    transition: background 0.15s;
    &:hover { background: #f0e6f7; }
  }

  // ── List ─────────────────────────────────────────────────────────
  &__list { display: flex; flex-direction: column; }

  &__row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 0;
    border-bottom: 1px solid #f0f0f0;
    &:last-child { border-bottom: none; }

    @media (min-width: 540px) { gap: 16px; }
  }

  &__row-img-wrap {
    flex-shrink: 0;
    width: 72px;
    height: 72px;
    border-radius: 12px;
    overflow: hidden;
    background: #f5f5f5;
    cursor: pointer;

    @media (min-width: 540px) { width: 88px; height: 88px; }
  }

  &__row-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__row-no-img {
    width: 100%;
    height: 100%;
    background: #f0f0f0;
  }

  &__row-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__row-name {
    font-size: 14px;
    font-weight: 600;
    color: #292929;
    cursor: pointer;
    &:hover { color: #993ca6; }

    @media (min-width: 540px) { font-size: 15px; }
  }

  &__row-weight {
    font-size: 12px;
    color: #b0b0b0;
  }

  &__row-right {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }

  &__row-total {
    font-size: 17px;
    font-weight: 700;
    color: #292929;
  }

  // ── Sidebar summary ───────────────────────────────────────────────
  &__sidebar {
    width: 100%;
    max-width: 380px;

    @media (max-width: 1023px) { max-width: none; }
  }

  &__summary {
    background: #fff;
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0,0,0,.08);
    display: flex;
    flex-direction: column;
    gap: 14px;
    position: sticky;
    top: 100px;
  }

  &__summary-title {
    font-size: 22px;
    font-weight: 700;
    color: #292929;
  }

  &__summary-rest {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #969696;
  }

  &__summary-divider {
    width: 100%;
    height: 1px;
    background: #f0f0f0;
  }

  &__summary-row {
    display: flex;
    justify-content: space-between;
    font-size: 15px;
    color: #555;
  }

  &__summary-total {
    display: flex;
    justify-content: space-between;
    font-size: 24px;
    font-weight: 800;
    color: #292929;
  }

  &__btn-back {
    height: 52px;
    width: 100%;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    color: #993ca6;
    border: 2px solid #993ca6;
    border-radius: 100px;
    background: transparent;
    transition: background 0.15s;
    &:hover { background: #f0e6f7; }
  }

  &__btn-clear {
    font-size: 13px;
    cursor: pointer;
    color: #b0b0b0;
    border: none;
    background: transparent;
    text-decoration: underline;
    text-align: center;
    &:hover { color: #993ca6; }
  }

  // ── Qty ───────────────────────────────────────────────────────────
  &__qty {
    display: flex;
    align-items: center;
    gap: 2px;
    background: #f5f5f5;
    border-radius: 100px;
    padding: 2px;
  }

  &__qty-btn {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: none;
    background: #fff;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    color: #993ca6;
    box-shadow: 0 1px 3px rgba(0,0,0,.1);
    line-height: 1;
    transition: background 0.15s;
    &:hover { background: #f0e6f7; }

    &--plus {
      background: #993ca6;
      color: #fff;
      &:hover { background: #7d2e8a; }
    }
  }

  &__qty-num {
    min-width: 22px;
    text-align: center;
    font-size: 14px;
    font-weight: 700;
    color: #292929;
  }

  // ── Modal ─────────────────────────────────────────────────────────
  &__overlay {
    position: fixed;
    z-index: 200;
    inset: 0;
    background: rgba(0,0,0,.55);
    display: flex;
    align-items: flex-end;
    justify-content: center;

    @media (min-width: 600px) {
      align-items: center;
      padding: 24px;
    }
  }

  &__modal {
    position: relative;
    width: 100%;
    max-width: 540px;
    background: #fff;
    border-radius: 24px 24px 0 0;
    overflow: hidden;
    max-height: 90vh;
    display: flex;
    flex-direction: column;

    @media (min-width: 600px) { border-radius: 24px; }
  }

  &__modal-close {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 10;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(255,255,255,.92);
    border: none;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,.15);
  }

  &__modal-img-wrap {
    width: 100%;
    aspect-ratio: 1;
    overflow: hidden;
    background: #f5f5f5;
    flex-shrink: 0;
    max-height: 260px;
  }

  &__modal-img  { width: 100%; height: 100%; object-fit: cover; }
  &__modal-no-img { width: 100%; height: 200px; background: #f5f5f5; }

  &__modal-body {
    padding: 20px 20px 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__modal-name {
    font-size: 22px;
    font-weight: 700;
    color: #292929;
  }

  &__modal-weight { font-size: 13px; color: #969696; }
  &__modal-desc { font-size: 14px; color: #555; line-height: 1.5; }

  &__modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 8px;
  }

  &__modal-price {
    font-size: 26px;
    font-weight: 800;
    color: #292929;
  }
}

// ── Animation ─────────────────────────────────────────────────────────────
.mc-modal-enter-active,
.mc-modal-leave-active {
  transition: opacity 0.2s;
  .mc__modal { transition: transform 0.25s cubic-bezier(.34,1.56,.64,1); }
}
.mc-modal-enter,
.mc-modal-leave-to {
  opacity: 0;
  .mc__modal { transform: translateY(30px); }
}
</style>
