import axios from 'axios';

interface ICoordinates {
  latitude: number;
  longitude: number;
}

interface IComponent {
  kind: string;
  name: string;
}

export default class GeolocationService {
  static YANDEX_MAPS_API_KEY: string;

  components: IComponent[];

  readonly coordinates: ICoordinates;

  constructor(coordinates: ICoordinates) {
    this.coordinates = coordinates;
  }

  static async create(coordinates: ICoordinates, YANDEX_MAPS_API_KEY: string) {
    GeolocationService.YANDEX_MAPS_API_KEY = YANDEX_MAPS_API_KEY;
    const instance = new GeolocationService(coordinates);
    await instance.loadAddressComponents();
    return instance;
  }

  static async getCoordinatesByAddress(address: string): Promise<ICoordinates | null> {
    const url = new URL('https://geocode-maps.yandex.ru/1.x/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('geocode', address);
    url.searchParams.set('apikey', GeolocationService.YANDEX_MAPS_API_KEY);

    try {
      const response = await axios.get(url.toString());

      const point = response?.data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos?.split(' ').map(Number);
      if (!point || point.length !== 2) {
        throw new Error('Не удалось обработать ответ API. Проверьте, валиден ли ответ сервера.');
      }

      return {
        longitude: point[0],
        latitude: point[1],
      };
    } catch (error) {
      console.error('Ошибка геокодирования:', error);
      return null;
    }
  }

  static createValidAddressForRequest(
    address: { region: string; city: string; street: string; home: string },
  ): string {
    return Object.values(address).join(', ');
  }

  getComponent(kind: string): string | null {
    const component = this.components.find((c) => c.kind === kind);
    return component?.name || null;
  }

  getCity(): string | null {
    return this.getComponent('locality');
  }

  getStreet(): string | null {
    return this.getComponent('street');
  }

  getHouse(): string | null {
    return this.getComponent('house');
  }

  getCoordinates(): ICoordinates {
    return this.coordinates;
  }

  async loadAddressComponents() {
    this.components = await this.getAddressComponentsFromCoordinates(this.coordinates);
  }

  async getAddressComponentsFromCoordinates(coordinates: ICoordinates): Promise<IComponent[]> {
    const { latitude, longitude } = coordinates;
    const url = new URL('https://geocode-maps.yandex.ru/1.x/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('geocode', `${longitude},${latitude}`);
    url.searchParams.set('apikey', GeolocationService.YANDEX_MAPS_API_KEY);

    const response = await axios.get(url.toString());

    const components = response?.data?.response
      ?.GeoObjectCollection?.featureMember?.[0]?.GeoObject
      ?.metaDataProperty?.GeocoderMetaData?.Address?.Components;

    if (!components) {
      throw new Error('Не удалось обработать ответ API. Проверьте, валиден ли ответ сервера.');
    }

    return components;
  }
}
