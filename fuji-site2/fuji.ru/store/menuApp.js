/**
 * Standalone Vuex module for /menu/** pages.
 * Zero dependency on catalog / cart / terminal / city stores.
 *
 * Data shapes
 * ───────────
 * navGroup  : { id, name, slug, firstSectionId }
 * section   : { id, name, products[] }
 * catalogGroup : { id, name, slug, sections[] }
 * product   : { id, name, description, price, weight, image, parentGroup }
 */

export const state = () => ({
  restaurant : null,
  navGroups  : [],     // top-level nav items (parent categories or leaf categories)
  catalog    : [],     // [{ id, name, slug, sections: [{ id, name, products[] }] }]
  allProducts: [],     // flat list — used for search
  cart       : [],     // [{ product, qty }]
  isLoaded   : false,
  loadError  : false,
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const mutations = {
  setRestaurant(state, r) {
    state.restaurant = r;
  },

  setData(state, { navGroups, catalog, allProducts }) {
    state.navGroups   = navGroups;
    state.catalog     = catalog;
    state.allProducts = allProducts;
    state.isLoaded    = true;
    state.loadError   = false;
  },

  setLoadError(state) {
    state.loadError = true;
    state.isLoaded  = true;
  },

  resetMenu(state) {
    state.restaurant  = null;
    state.navGroups   = [];
    state.catalog     = [];
    state.allProducts = [];
    state.isLoaded    = false;
    state.loadError   = false;
    // cart is kept intentionally — user may navigate back
  },

  addItem(state, product) {
    const idx = state.cart.findIndex(i => i.product.id === product.id);
    if (idx === -1) {
      state.cart.push({ product, qty: 1 });
    } else {
      const item = { ...state.cart[idx], qty: state.cart[idx].qty + 1 };
      state.cart.splice(idx, 1, item);
    }
  },

  decreaseItem(state, productId) {
    const idx = state.cart.findIndex(i => i.product.id === productId);
    if (idx === -1) return;
    if (state.cart[idx].qty <= 1) {
      state.cart.splice(idx, 1);
    } else {
      const item = { ...state.cart[idx], qty: state.cart[idx].qty - 1 };
      state.cart.splice(idx, 1, item);
    }
  },

  removeItem(state, productId) {
    state.cart = state.cart.filter(i => i.product.id !== productId);
  },

  clearCart(state) {
    state.cart = [];
  },
};

// ─── Actions ─────────────────────────────────────────────────────────────────

export const actions = {
  async initMenu({ commit }, { slug, apiUrl }) {
    try {
      const [restaurant, catalogData] = await Promise.all([
        this.$axios.$get(`${apiUrl}/api/v1/restaurants/${slug}`),
        this.$axios.$get(`${apiUrl}/api/v1/restaurants/${slug}/catalog`),
      ]);

      commit('setRestaurant', restaurant);

      const { groups = [], products = [] } = catalogData;

      // Build a map of parent → [children] using sort_order from API
      const parentById = {};
      groups.forEach(g => {
        if (!g.parentGroup) {
          parentById[g.id] = { ...g, children: [] };
        }
      });
      groups.forEach(g => {
        if (g.parentGroup && parentById[g.parentGroup]) {
          parentById[g.parentGroup].children.push(g);
        }
      });

      // Sort parents by order field
      const parents = Object.values(parentById).sort((a, b) => (a.order || 0) - (b.order || 0));

      const navGroups   = [];
      const catalog     = [];
      const allProducts = [];

      parents.forEach(parent => {
        if (parent.children.length > 0) {
          // ── Parent with sub-categories ──────────────────────────────
          const sections = parent.children
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(child => ({
              id      : child.id,
              name    : child.name,
              products: products.filter(p => p.parentGroup === child.id),
            }))
            .filter(s => s.products.length > 0);

          if (sections.length === 0) return;

          allProducts.push(...sections.flatMap(s => s.products));

          navGroups.push({
            id            : parent.id,
            name          : parent.name,
            slug          : parent.slug,
            // scroll target is the parent group wrapper element
            firstSectionId: parent.id,
          });

          catalog.push({
            id      : parent.id,
            name    : parent.name,
            slug    : parent.slug,
            sections,
          });
        } else {
          // ── Leaf parent — products live directly here ─────────────
          const items = products.filter(p => p.parentGroup === parent.id);
          if (items.length === 0) return;

          allProducts.push(...items);

          navGroups.push({
            id            : parent.id,
            name          : parent.name,
            slug          : parent.slug,
            firstSectionId: parent.id,
          });

          catalog.push({
            id      : parent.id,
            name    : parent.name,
            slug    : parent.slug,
            sections: [{ id: parent.id, name: null, products: items }],
          });
        }
      });

      commit('setData', { navGroups, catalog, allProducts });
    } catch (e) {
      console.error('[menuApp] initMenu error:', e.message);
      commit('setLoadError');
    }
  },
};

// ─── Getters ─────────────────────────────────────────────────────────────────

export const getters = {
  restaurant : s => s.restaurant,
  navGroups  : s => s.navGroups,
  catalog    : s => s.catalog,
  allProducts: s => s.allProducts,
  cart       : s => s.cart,
  cartItems  : s => s.cart,
  isLoaded   : s => s.isLoaded,
  loadError  : s => s.loadError,

  cartCount: s => s.cart.reduce((acc, i) => acc + i.qty, 0),
  cartTotal: s => s.cart.reduce((acc, i) => acc + i.product.price * i.qty, 0),

  qtyById: s => id => {
    const item = s.cart.find(i => i.product.id === id);
    return item ? item.qty : 0;
  },
};
