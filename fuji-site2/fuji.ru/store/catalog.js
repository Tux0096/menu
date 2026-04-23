export const state = () => ({
  catalog: [],
  products: [],
  recommendedProducts: [],
  stopList: [],
  likingProduct: [],

  selectedFilters: [],
  searchString: '',

  //
  isCatalogLoad: false,

});

export const mutations = {
  setCatalog(state, payload) {
    state.catalog = payload;
  },

  setProducts(state, payload) {
    state.products = payload;
  },

  setRecommendedProducts(state, payload) {
    state.recommendedProducts = payload;
  },

  setStopList(state, payload) {
    state.stopList = payload;
  },

  setSelectedFilters(state, payload) {
    state.selectedFilters = payload;
    state.searchString = '';
  },

  setSearchString(state, payload) {
    state.searchString = payload;
    state.selectedFilters = [];
  },
  clearAllFilers(state, payload) {
    state.searchString = '';
    state.selectedFilters = [];
  },
  incrementLikes(state, product) {
    product.likesCount += 1;
    product.isLiked = true;
  },
  decrementLikes(state, product) {
    product.likesCount -= 1;
    product.isLiked = false;
  },
  setIsLiked(state, product) {
    product.isLiked = true;
  },
  setIsSectionShownTrue(state, section) {
    section.isShown = true;
  },
  // isCatalogLoad
  setIsCatalogLoad(state, payload) {
    state.isCatalogLoad = payload;
  },

};

export const actions = {
  async initCatalog({ commit, rootGetters }) {
    commit('setSelectedFilters', []);
    commit('setSearchString', '');
    try {
      // Получаем terminalId из глобального store
      const terminalId = rootGetters['terminal/terminalId'];

      const params = {};
      if (terminalId) {
        params.deliveryTerminalId = terminalId;
      }

      const { data: { groups, products, stopList } } = await this.$axios.get(
        `${this.$config.FRONT_API_URL}/api/v1/catalog`,
        { params },
      );

      const filteredProducts = products.filter((product) => {
        if (rootGetters['city/isSamara'] && product.isSamaraHidden) {
          return false;
        }
        if (rootGetters['city/isNovokujbyshevsk']
          && product.isNovokujbyshevskHidden) {
          return false;
        }
        if (rootGetters['city/isTolyatti'] && product.isTolyattiHidden) {
          return false;
        }

        return true;
      });

      const groupWithItems = groups.map((g) => ({
        ...g,
        isShown: false,
        items: filteredProducts
          .filter((p) => p.parentGroup === g.id)
          .map((p) => ({
            ...p,
            stringCategoryNames: g.name,
          })),
      }));
      const catalog = groupWithItems
        .filter((g) => g.isIncludedInMenu)
        .map((g) => ({
          ...g,
          groups: groupWithItems.filter((el) => el.parentGroup === g.id),
        }));

      commit('setCatalog', catalog);
      commit('setProducts', filteredProducts);

      commit('setStopList', stopList);
      commit('setIsCatalogLoad', true);
    } catch (e) {
      console.log(e);
    }
  },

};
export const getters = {
  catalog: ({ catalog }) => catalog,

  products: ({ products }) => products,

  catalogIsIncludedInMenu: ({ catalog }, _getters, rootState) => {
    const filteredGroups = catalog.filter((group) => {
      const { additionalInfo } = group;

      if (additionalInfo?.isServiceGroup) {
        return false;
      }

      if (group.isGroupModifier) {
        return false;
      }

      return group.isIncludedInMenu;
    });

    const groupsWithoutAllergents = filteredGroups.map((group) => {
      const { userAllergens } = rootState.user;
      const productsWithoutAllergens = group
        .items.filter(
          (p) => !p.allergens?.some((a) => userAllergens.includes(a.code)),
        );

      return { ...group, items: productsWithoutAllergens };
    });

    return groupsWithoutAllergents;
  },

  catalogIsIncludedInMenuFiltered: (state, getters) => {
    const { selectedFilters, searchString } = state;
    const { catalogIsIncludedInMenu } = getters;

    if (selectedFilters.length === 0 && searchString.length === 0) {
      return catalogIsIncludedInMenu;
    }

    const searchStringToLower = searchString.toLowerCase();

    const filterBySearchString = (product) => product.name.toLowerCase()
      .includes(searchStringToLower)
      || product.description.toLowerCase()
        .includes(searchStringToLower)
      || product.stringCategoryNames.toLowerCase()
        .includes(searchStringToLower);

    const filterBySelectedFilters = (product) => product.filters
      && product.filters.some((filter) => selectedFilters.includes(filter.code));

    return catalogIsIncludedInMenu.map((category) => {
      const filteredItems = category.items.filter(
        selectedFilters.length ? filterBySelectedFilters : filterBySearchString,
      );
      return { ...category, items: filteredItems };
    });
  },

  productsIsIncludedInMenu: (state, getters) => getters.catalogIsIncludedInMenu
    .flatMap((g) => g.items),

  currentSectionData: (state, { catalogIsIncludedInMenu }) => (slug) => catalogIsIncludedInMenu
    .find((s) => s.slug === slug),

  currentProductData: (state, { productsIsIncludedInMenu }) => (slug) => productsIsIncludedInMenu
    .find((s) => s.slug === slug),

  productByCode: ({ products }) => (code) => products.find((p) => p.code
    === code),

  productById: ({ products }) => (id) => products.find((p) => p.id === id),

  zoneStopList: ({ stopList }) => (zoneId) => stopList
    .filter((s) => s.deliveryTerminalId === zoneId),

  recommendedProducts({ catalog }, _getters, _rootState, rootGetters) {
    const needCategory = catalog.find(
      (el) => el.id === rootGetters['setting/SECTION_ID_ADD_TO_ORDER'],
    );
    return needCategory?.items?.length > 0 ? needCategory.items : [];
  },
  additionallyProducts({ catalog }, _getters, _rootState, rootGetters) {
    const needCategory = catalog.find(
      (el) => el.id === rootGetters['setting/SECTION_ID_ADDITIONALLY'],
    );
    return needCategory?.items?.length > 0 ? needCategory.items : [];
  },
  filterList({ catalog }) {
    let result = [];
    catalog.forEach((g) => {
      const filters = g.items.filter((i) => i.filters)
        .flatMap((i) => i.filters);
      result = result.concat(filters);
    });
    return result.reduce((acc, curr) => {
      if (!acc.find((el) => el.code === curr.code)) {
        acc.push(curr);
      }
      return acc;
    }, []);
  },

  isCatalogFiltered(state) {
    return state.selectedFilters.length > 0 || state.searchString.length > 0;
  },
  isCatalogLoad: ({ isCatalogLoad }) => isCatalogLoad,
};
