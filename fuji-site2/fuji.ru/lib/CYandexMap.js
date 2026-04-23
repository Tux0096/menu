export default class CYandexMap {
  constructor(apiKey) {
    this.ymaps = null;
    this.apiKey = apiKey;
  }

  // Load Yandex Maps script into the page
  static async loadYandexMapsScript(apiKey) {
    return new Promise((resolve) => {
      const script = document.createElement('script');

      const url = new URL('https://api-maps.yandex.ru/2.1/');
      url.searchParams.set('lang', 'ru_RU');
      url.searchParams.set('coordorder', 'longlat');
      url.searchParams.set('mode', 'release');
      url.searchParams.set('load', 'package.full');
      url.searchParams.set('norequire', '');
      url.searchParams.set('nojsapi', '');
      url.searchParams.set('apikey', apiKey);

      script.src = url.toString();
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      document.head.append(script);
    });
  }

  // Initialize Yandex Map
  async init(idContainer, params, deliveryZones, fromGoogle = false) {
    if (!window.ymaps) {
      await CYandexMap.loadYandexMapsScript(this.apiKey);
    }

    this.ymaps = window.ymaps;

    await this.waitForYmaps();
    this.initializeMap(idContainer, params);
    this.deliveryPoint = this.createDeliveryPoint();

    const zones = fromGoogle
      ? this.convertGoogleZonesToYandex(deliveryZones)
      : deliveryZones;
    this.addDeliveryZones(zones);
  }

  // Wait for Yandex Maps to be ready
  waitForYmaps() {
    return new Promise((resolve) => {
      this.ymaps.ready(resolve);
    });
  }

  // Create a new Yandex map instance
  initializeMap(idContainer, params) {
    this.map = new this.ymaps.Map(idContainer, params);
  }

  // Create a delivery point geo-object
  createDeliveryPoint() {
    return new this.ymaps.GeoObject({
      geometry: { type: 'Point' },
      properties: {},
    });
  }

  // Convert zones from Google Maps format to Yandex Maps format
  convertGoogleZonesToYandex(deliveryZones) {
    return {
      type: 'FeatureCollection',
      features: deliveryZones.map((zone) => ({
        type: 'Feature',
        id: 0,
        geometry: {
          type: 'Polygon',
          coordinates: [zone.coords.map((coord) => ([coord.lng, coord.lat]))],
        },
        properties: {
          fill: zone.fillColor,
          'fill-opacity': 0.5,
          stroke: zone.fillColor,
          zoneId: zone.zoneId,
        },
      })),
    };
  }

  // Add delivery zones to the map
  addDeliveryZones(zoneYandexData) {
    const deliveryZones = this.ymaps.geoQuery(zoneYandexData)
      .addToMap(this.map);

    deliveryZones.each((obj) => {
      obj.options.set({
        fillColor: obj.properties.get('fill'),
        fillOpacity: obj.properties.get('fill-opacity'),
        strokeColor: obj.properties.get('stroke'),
        strokeWidth: obj.properties.get('stroke-width'),
        strokeOpacity: obj.properties.get('stroke-opacity'),
        interactivityModel: 'default#transparent',
      });
    });

    this.deliveryZones = deliveryZones;
  }

  // Find delivery zone for a given address
  async getZone(address) {
    const res = await this.ymaps.geocode(address);
    const firstGeoObject = res.geoObjects.get(0);

    if (!firstGeoObject) return null;

    const coords = firstGeoObject.geometry.getCoordinates();
    const deliveryZone = this.deliveryZones.searchContaining(coords)
      .get(0);

    if (deliveryZone) {
      this.deliveryPoint.geometry.setCoordinates(coords);
      this.deliveryPoint.options.set('iconColor', deliveryZone.properties.get('fill'));
      this.map.geoObjects.add(this.deliveryPoint);
      return deliveryZone;
    }
    return null;
  }

  // Extract zone ID from a zone object
  getZoneId(zone) {
    return zone.properties.get('zoneId');
  }
}
