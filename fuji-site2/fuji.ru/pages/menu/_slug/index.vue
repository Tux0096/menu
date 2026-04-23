<template>
  <div class="mp">

    <!-- ── Loading ──────────────────────────────────────────────────── -->
    <div v-if="!isLoaded" class="mp__loading">
      <div class="mp__spinner" />
    </div>

    <!-- ── Error ────────────────────────────────────────────────────── -->
    <div v-else-if="loadError" class="mp__error">
      <p>Не удалось загрузить меню</p>
      <button class="mp__error-btn" @click="reload">Попробовать снова</button>
    </div>

    <!-- ── Content ──────────────────────────────────────────────────── -->
    <template v-else>

      <!-- Sticky bar: nav tabs OR search -->
      <div class="mp__bar" ref="bar">
        <!-- Search input (visible when searching) -->
        <div v-if="searching" class="mp__search-row">
          <svg class="mp__search-ico" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#993ca6" stroke-width="2" />
            <path d="M16.5 16.5L21 21" stroke="#993ca6" stroke-width="2" stroke-linecap="round" />
          </svg>
          <input
            ref="searchInput"
            v-model="searchQuery"
            class="mp__search-input"
            placeholder="Поиск по меню…"
            type="search"
          />
          <button class="mp__search-close" @click="closeSearch">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#292929" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <!-- Category tabs (visible when not searching) -->
        <div v-else class="mp__nav">
          <div class="mp__nav-inner" ref="navInner">
            <button
              v-for="g in navGroups"
              :key="g.id"
              :ref="`navBtn_${g.id}`"
              :class="['mp__nav-btn', { 'mp__nav-btn--active': activeGroupId === g.id }]"
              @click="scrollToGroup(g.id)"
            >
              {{ g.name }}
            </button>
          </div>

          <!-- Search toggle -->
          <button class="mp__search-toggle" @click="openSearch" aria-label="Поиск">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#292929" stroke-width="2" />
              <path d="M16.5 16.5L21 21" stroke="#292929" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <!-- ── Search results ──────────────────────────────────────────── -->
      <div v-if="searching" class="mp__catalog mp__catalog--search">
        <template v-if="searchQuery.trim()">
          <div v-if="searchResults.length" class="mp__products">
            <div
              v-for="p in searchResults"
              :key="p.id"
              class="mp__card"
              @click="openModal(p)"
            >
              <mp-card-inner :product="p" :qty="qtyById(p.id)" @add="addItem" @decrease="decreaseItem" />
            </div>
          </div>
          <div v-else class="mp__noresult">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="29" cy="29" r="18" stroke="#d0d0d0" stroke-width="3" />
              <path d="M43 43L55 55" stroke="#d0d0d0" stroke-width="3" stroke-linecap="round" />
              <path d="M21 29h16M29 21v16" stroke="#d0d0d0" stroke-width="3" stroke-linecap="round" />
            </svg>
            <p>По запросу «{{ searchQuery }}» ничего не найдено</p>
          </div>
        </template>
        <div v-else class="mp__noresult mp__noresult--hint">
          Введите название блюда…
        </div>
      </div>

      <!-- ── Catalog ─────────────────────────────────────────────────── -->
      <div v-else class="mp__catalog" ref="catalog">
        <div
          v-for="group in catalog"
          :id="`group-${group.id}`"
          :key="group.id"
          class="mp__group"
        >
          <!-- Group header (parent category name) -->
          <h2 class="mp__group-title">{{ group.name }}</h2>

          <!-- Sub-sections (one or more) -->
          <div
            v-for="section in group.sections"
            :key="section.id"
            class="mp__section"
          >
            <h3 v-if="section.name" class="mp__section-title">{{ section.name }}</h3>
            <div class="mp__products">
              <div
                v-for="product in section.products"
                :key="product.id"
                class="mp__card"
              >
                <div class="mp__card-img-wrap" @click="openModal(product)">
                  <img
                    v-if="product.image"
                    :src="product.image"
                    :alt="product.name"
                    class="mp__card-img"
                    loading="lazy"
                  />
                  <div v-else class="mp__card-no-img">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <path d="M8 30l9-10 6 7 4-5 9 8" stroke="#d8d8d8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                      <circle cx="14" cy="16" r="3" fill="#d8d8d8" />
                    </svg>
                  </div>
                </div>
                <div class="mp__card-body">
                  <div class="mp__card-name" @click="openModal(product)">{{ product.name }}</div>
                  <div v-if="product.weight" class="mp__card-weight">{{ product.weight }}</div>
                  <div v-if="product.description" class="mp__card-desc">{{ product.description }}</div>
                  <div class="mp__card-footer">
                    <span class="mp__card-price">{{ product.price }}&nbsp;₽</span>
                    <div class="mp__card-actions" @click.stop>
                      <button
                        v-if="qtyById(product.id) === 0"
                        class="mp__add-btn"
                        @click="addItem(product)"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M9 3v12M3 9h12" stroke="#fff" stroke-width="2.5" stroke-linecap="round" />
                        </svg>
                      </button>
                      <div v-else class="mp__qty">
                        <button class="mp__qty-btn" @click="decreaseItem(product.id)">−</button>
                        <span class="mp__qty-num">{{ qtyById(product.id) }}</span>
                        <button class="mp__qty-btn mp__qty-btn--plus" @click="addItem(product)">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ── Product modal ────────────────────────────────────────────── -->
    <transition name="mp-modal">
      <div v-if="modal" class="mp__overlay" @click.self="closeModal">
        <div class="mp__modal">
          <button class="mp__modal-close" @click="closeModal">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#292929" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>

          <div class="mp__modal-img-wrap">
            <img
              v-if="modal.image"
              :src="modal.image"
              :alt="modal.name"
              class="mp__modal-img"
            />
            <div v-else class="mp__modal-no-img" />
          </div>

          <div class="mp__modal-body">
            <h3 class="mp__modal-name">{{ modal.name }}</h3>
            <p v-if="modal.weight" class="mp__modal-weight">{{ modal.weight }}</p>
            <p v-if="modal.description" class="mp__modal-desc">{{ modal.description }}</p>

            <div class="mp__modal-nutrition" v-if="modal.energyAmount || modal.fatAmount || modal.fiberAmount || modal.carbohydrateAmount">
              <div v-if="modal.energyAmount" class="mp__nutrition-item">
                <span class="mp__nutrition-val">{{ Math.round(modal.energyAmount) }}</span>
                <span class="mp__nutrition-label">ккал</span>
              </div>
              <div v-if="modal.fiberAmount" class="mp__nutrition-item">
                <span class="mp__nutrition-val">{{ modal.fiberAmount }}</span>
                <span class="mp__nutrition-label">белки</span>
              </div>
              <div v-if="modal.fatAmount" class="mp__nutrition-item">
                <span class="mp__nutrition-val">{{ modal.fatAmount }}</span>
                <span class="mp__nutrition-label">жиры</span>
              </div>
              <div v-if="modal.carbohydrateAmount" class="mp__nutrition-item">
                <span class="mp__nutrition-val">{{ modal.carbohydrateAmount }}</span>
                <span class="mp__nutrition-label">углеводы</span>
              </div>
            </div>

            <div class="mp__modal-footer">
              <span class="mp__modal-price">{{ modal.price }}&nbsp;₽</span>
              <div @click.stop>
                <button
                  v-if="qtyById(modal.id) === 0"
                  class="mp__modal-add"
                  @click="addItem(modal)"
                >
                  В корзину
                </button>
                <div v-else class="mp__qty">
                  <button class="mp__qty-btn" @click="decreaseItem(modal.id)">−</button>
                  <span class="mp__qty-num">{{ qtyById(modal.id) }}</span>
                  <button class="mp__qty-btn mp__qty-btn--plus" @click="addItem(modal)">+</button>
                </div>
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
  name: 'MenuRestaurant',
  layout: 'menu',

  data() {
    return {
      activeGroupId: null,
      searching    : false,
      searchQuery  : '',
      modal        : null,
      // internal: real sticky height measured from DOM
      _stickyH     : 120,
      _rafId       : null,
    };
  },

  computed: {
    isLoaded()    { return this.$store.getters['menuApp/isLoaded']; },
    loadError()   { return this.$store.getters['menuApp/loadError']; },
    navGroups()   { return this.$store.getters['menuApp/navGroups']; },
    catalog()     { return this.$store.getters['menuApp/catalog']; },
    allProducts() { return this.$store.getters['menuApp/allProducts']; },
    qtyById()     { return this.$store.getters['menuApp/qtyById']; },

    searchResults() {
      const q = this.searchQuery.trim().toLowerCase();
      if (!q) return [];
      return this.allProducts.filter(
        p => (p.name || '').toLowerCase().includes(q)
          || (p.description || '').toLowerCase().includes(q),
      );
    },
  },

  async mounted() {
    const apiUrl = (this.$config && this.$config.FRONT_API_URL) || 'http://localhost:3101';
    this.$store.commit('menuApp/resetMenu');
    await this.$store.dispatch('menuApp/initMenu', { slug: this.$route.params.slug, apiUrl });

    if (this.navGroups.length) this.activeGroupId = this.navGroups[0].id;

    this.$nextTick(() => {
      this._measureAndApply();
      this._startScrollSpy();
      window.addEventListener('resize', this._measureAndApply);
    });
  },

  beforeDestroy() {
    window.removeEventListener('resize', this._measureAndApply);
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._scrollHandler) window.removeEventListener('scroll', this._scrollHandler, { passive: true });
  },

  methods: {
    // ── Load ────────────────────────────────────────────────────────
    reload() {
      const apiUrl = (this.$config && this.$config.FRONT_API_URL) || 'http://localhost:3101';
      this.$store.commit('menuApp/resetMenu');
      this.$store.dispatch('menuApp/initMenu', { slug: this.$route.params.slug, apiUrl });
    },

    // ── Cart ────────────────────────────────────────────────────────
    addItem(product) {
      this.$store.commit('menuApp/addItem', product);
    },
    decreaseItem(productId) {
      this.$store.commit('menuApp/decreaseItem', productId);
    },

    // ── Search ──────────────────────────────────────────────────────
    openSearch() {
      this.searching = true;
      this.$nextTick(() => {
        if (this.$refs.searchInput) this.$refs.searchInput.focus();
        this._measureAndApply();
      });
    },
    closeSearch() {
      this.searching   = false;
      this.searchQuery = '';
      this.$nextTick(() => this._measureAndApply());
    },

    // ── Modal ────────────────────────────────────────────────────────
    openModal(product) {
      this.modal = product;
      document.body.style.overflow = 'hidden';
    },
    closeModal() {
      this.modal = null;
      document.body.style.overflow = '';
    },

    // ── Scroll: measure heights ──────────────────────────────────────
    _measureAndApply() {
      const header = document.querySelector('.ml__header');
      const bar    = this.$refs.bar;
      if (!header || !bar) return;

      // Position the bar right below the fixed header
      const headerH = header.offsetHeight;
      bar.style.top = `${headerH}px`;

      // Apply scroll-margin-top to every group anchor
      const totalH = headerH + bar.offsetHeight + 4;
      this._stickyH = totalH;

      this.catalog.forEach(g => {
        const el = document.getElementById(`group-${g.id}`);
        if (el) el.style.scrollMarginTop = `${totalH}px`;
      });
    },

    // ── Scroll: click a nav tab ──────────────────────────────────────
    scrollToGroup(groupId) {
      this.activeGroupId = groupId;
      const el = document.getElementById(`group-${groupId}`);
      if (el) {
        // scrollIntoView respects scroll-margin-top we set above
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // Keep the nav button in view
      this.$nextTick(() => {
        const btnArr = this.$refs[`navBtn_${groupId}`];
        const btn = Array.isArray(btnArr) ? btnArr[0] : btnArr;
        if (btn && this.$refs.navInner) {
          const inner = this.$refs.navInner;
          const btnL  = btn.offsetLeft;
          const btnW  = btn.offsetWidth;
          const innerW = inner.offsetWidth;
          inner.scrollTo({ left: btnL - innerW / 2 + btnW / 2, behavior: 'smooth' });
        }
      });
    },

    // ── Scroll spy: update active tab while scrolling ────────────────
    _startScrollSpy() {
      const onScroll = () => {
        if (this._rafId) return;
        this._rafId = requestAnimationFrame(() => {
          this._rafId = null;
          this._updateActive();
        });
      };
      this._scrollHandler = onScroll;
      window.addEventListener('scroll', onScroll, { passive: true });
    },

    _updateActive() {
      const offset = this._stickyH + 8;
      let bestId = null;
      let bestTop = -Infinity;

      this.catalog.forEach(g => {
        const el = document.getElementById(`group-${g.id}`);
        if (!el) return;
        const top = el.getBoundingClientRect().top;
        if (top <= offset && top > bestTop) {
          bestTop = top;
          bestId  = g.id;
        }
      });

      if (bestId && bestId !== this.activeGroupId) {
        this.activeGroupId = bestId;
        // Keep active button in view on the nav
        const btnArr = this.$refs[`navBtn_${bestId}`];
        const btn = Array.isArray(btnArr) ? btnArr[0] : btnArr;
        if (btn && this.$refs.navInner) {
          const inner = this.$refs.navInner;
          const btnL  = btn.offsetLeft;
          const btnW  = btn.offsetWidth;
          const innerW = inner.offsetWidth;
          inner.scrollTo({ left: btnL - innerW / 2 + btnW / 2, behavior: 'smooth' });
        }
      }
    },
  },
};
</script>

<style lang="scss" scoped>

// ── Page wrapper ───────────────────────────────────────────────────────────
.mp {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding-bottom: 120px;

  &__loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
  }

  &__spinner {
    width: 52px;
    height: 52px;
    border: 4px solid #f0f0f0;
    border-top-color: #993ca6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  &__error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 40vh;
    gap: 16px;
    color: #969696;
    font-size: 16px;
  }

  &__error-btn {
    padding: 12px 28px;
    border-radius: 100px;
    border: 1.5px solid #993ca6;
    color: #993ca6;
    font-size: 15px;
    font-weight: 600;
    background: transparent;
    cursor: pointer;
    &:hover { background: #f0e6f7; }
  }
}

// ── Sticky bar (nav OR search) ─────────────────────────────────────────────
.mp__bar {
  position: sticky;
  z-index: 50;
  top: 52px; // overridden by JS with the real header height
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
}

// ── Category nav ───────────────────────────────────────────────────────────
.mp__nav {
  display: flex;
  align-items: center;
}

.mp__nav-inner {
  flex: 1;
  display: flex;
  overflow-x: auto;
  gap: 8px;
  padding: 10px 12px;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }

  @media (min-width: 768px) { padding: 12px 24px; }
}

.mp__nav-btn {
  flex-shrink: 0;
  height: 34px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  border-radius: 100px;
  border: 1px solid #ebebeb;
  background: #f5f5f5;
  color: #292929;
  transition: background 0.15s, border-color 0.15s, color 0.15s;

  @media (min-width: 768px) { height: 36px; font-size: 14px; }

  &--active {
    background: #fff;
    border-color: #993ca6;
    color: #993ca6;
    font-weight: 600;
  }

  &:hover:not(&--active) {
    background: #f0e6f7;
    border-color: #c48fd4;
  }
}

.mp__search-toggle {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 50%;
  transition: background 0.15s;
  &:hover { background: #f5f5f5; }
}

// ── Search row ─────────────────────────────────────────────────────────────
.mp__search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;

  @media (min-width: 768px) { padding: 12px 24px; }
}

.mp__search-ico {
  flex-shrink: 0;
}

.mp__search-input {
  flex: 1;
  height: 36px;
  padding: 0 12px;
  font-size: 15px;
  border: 1.5px solid #993ca6;
  border-radius: 100px;
  outline: none;
  background: #faf5ff;
  color: #292929;

  &::placeholder { color: #b0b0b0; }

  // Remove browser search clear button
  &::-webkit-search-cancel-button { -webkit-appearance: none; }
}

.mp__search-close {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 50%;
  transition: background 0.15s;
  &:hover { background: #f5f5f5; }
}

// ── Search results ─────────────────────────────────────────────────────────
.mp__catalog--search {
  padding: 24px 16px;

  @media (min-width: 768px) { padding: 24px; }
}

.mp__noresult {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
  gap: 16px;
  color: #969696;
  font-size: 16px;
  text-align: center;

  &--hint {
    font-size: 15px;
    color: #b0b0b0;
    min-height: 30vh;
  }
}

// ── Catalog ────────────────────────────────────────────────────────────────
.mp__catalog {
  padding: 0 16px;

  @media (min-width: 768px) { padding: 0 24px; }
}

.mp__group {
  margin-top: 32px;

  @media (min-width: 768px) { margin-top: 40px; }
}

.mp__group-title {
  font-size: 24px;
  font-weight: 800;
  color: #292929;
  margin-bottom: 20px;

  @media (min-width: 768px) { font-size: 30px; }
}

.mp__section {
  margin-bottom: 24px;
}

.mp__section-title {
  font-size: 16px;
  font-weight: 600;
  color: #993ca6;
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f0e6f7;

  @media (min-width: 768px) { font-size: 18px; }
}

// ── Product grid ───────────────────────────────────────────────────────────
.mp__products {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  @media (min-width: 900px)  { grid-template-columns: repeat(4, 1fr); }
  @media (min-width: 1280px) { grid-template-columns: repeat(5, 1fr); }
}

// ── Product card ───────────────────────────────────────────────────────────
.mp__card {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.2s;

  &:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); }
}

.mp__card-img-wrap {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: #f5f5f5;
  cursor: pointer;
  flex-shrink: 0;
}

.mp__card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
  .mp__card:hover & { transform: scale(1.04); }
}

.mp__card-no-img {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f8f8;
}

.mp__card-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 10px;
  gap: 3px;
}

.mp__card-name {
  font-size: 13px;
  font-weight: 600;
  color: #292929;
  line-height: 1.3;
  cursor: pointer;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;

  &:hover { color: #993ca6; }

  @media (min-width: 768px) { font-size: 14px; }
}

.mp__card-weight {
  font-size: 11px;
  color: #b0b0b0;
}

.mp__card-desc {
  font-size: 11px;
  color: #969696;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;

  @media (min-width: 768px) { font-size: 12px; }
}

.mp__card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 8px;
  flex-wrap: wrap;
  gap: 4px;
}

.mp__card-price {
  font-size: 16px;
  font-weight: 700;
  color: #292929;

  @media (min-width: 768px) { font-size: 18px; }
}

.mp__card-actions { display: flex; align-items: center; }

// ── Add / qty controls ─────────────────────────────────────────────────────
.mp__add-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #993ca6;
  border: none;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  &:hover { background: #7d2e8a; }
  &:active { transform: scale(0.92); }
}

.mp__qty {
  display: flex;
  align-items: center;
  gap: 2px;
  background: #f5f5f5;
  border-radius: 100px;
  padding: 2px;
}

.mp__qty-btn {
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

.mp__qty-num {
  min-width: 22px;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: #292929;
}

// ── Product modal ──────────────────────────────────────────────────────────
.mp__overlay {
  position: fixed;
  z-index: 200;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: flex-end;
  justify-content: center;

  @media (min-width: 600px) {
    align-items: center;
    padding: 24px;
  }
}

.mp__modal {
  position: relative;
  width: 100%;
  max-width: 540px;
  background: #fff;
  border-radius: 24px 24px 0 0;
  overflow: hidden;
  max-height: 92vh;
  display: flex;
  flex-direction: column;

  @media (min-width: 600px) {
    border-radius: 24px;
    max-height: 86vh;
  }
}

.mp__modal-close {
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
  background: rgba(255, 255, 255, 0.92);
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,.15);
}

.mp__modal-img-wrap {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: #f5f5f5;
  flex-shrink: 0;
  max-height: 45vw;

  @media (min-width: 600px) { max-height: 260px; }
}

.mp__modal-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mp__modal-no-img {
  width: 100%;
  height: 200px;
  background: #f5f5f5;
}

.mp__modal-body {
  padding: 20px 20px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mp__modal-name {
  font-size: 20px;
  font-weight: 700;
  color: #292929;
  line-height: 1.2;

  @media (min-width: 600px) { font-size: 24px; }
}

.mp__modal-weight {
  font-size: 13px;
  color: #969696;
}

.mp__modal-desc {
  font-size: 14px;
  color: #555;
  line-height: 1.5;
}

.mp__modal-nutrition {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 14px;
  background: #f8f8f8;
  border-radius: 12px;
}

.mp__nutrition-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.mp__nutrition-val {
  font-size: 15px;
  font-weight: 700;
  color: #292929;
}

.mp__nutrition-label {
  font-size: 11px;
  color: #969696;
}

.mp__modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.mp__modal-price {
  font-size: 28px;
  font-weight: 800;
  color: #292929;
}

.mp__modal-add {
  height: 48px;
  padding: 0 28px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  border: none;
  border-radius: 100px;
  background: #993ca6;
  transition: background 0.15s;
  &:hover { background: #7d2e8a; }
}

// ── Animations ─────────────────────────────────────────────────────────────
.mp-modal-enter-active,
.mp-modal-leave-active {
  transition: opacity 0.2s;
  .mp__modal { transition: transform 0.25s cubic-bezier(.34,1.56,.64,1); }
}
.mp-modal-enter,
.mp-modal-leave-to {
  opacity: 0;
  .mp__modal { transform: translateY(30px); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
