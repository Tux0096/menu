import _sequelize from 'sequelize';
import _Addresses from '../address/address.model.js';
import _Blocks from './blocks.js';
import _Cities from './cities.js';
import _Customers from '../user/user.model.js';
import _DeliveryTerminals from './deliveryTerminals.js';
import _DeliveryZone from '../map/map.model.js';
import _Deliveries from '../order/models/deliveries.js';
import _Devices from './devices.js';
import _ExternalClients from './external-clients.js';
import _Files from './files.js';
import _Groups from './groups.js';
import _Iiko from './iiko.js';
import _Likes from './likes.js';
import _Notifications from './notifications.js';
import _Options from './options.js';
import _OrderIikoAnswer from '../order/models/orderIikoAnswer.js';
import _OrderProductModifiers from '../order/models/orderProductModifiers.js';
import _OrderProducts from '../order/models/orderProducts.js';
import _OrderSberbank from '../order/models/orderSberbank.js';
import _Orders from '../order/models/orders.js';
import _OrderStatusLogs from '../order/models/orderStatusLogs.js';
import _Pages from './pages.js';
import _PaymentTypes from './paymentTypes.js';
import _ProductGroupModifiers from './productGroupModifiers.js';
import _ProductGroupModifiersChildren from './productGroupModifiersChildren.js';
import _ProductModifiers from './productModifiers.js';
import _Products from './products.js';
import _Promocodes from './promocodes.js';
import _PromocodeUserSegments from './promocode_user_segments.js';
import _Reviews from './reviews.js';
import _Sberbank from './sberbank.js';
import _Settings from './settings.js';
import _ShopImages from './shopImages.js';
import _Slides from '../slide/slide.model.js';
import _Stories from '../story/story.model.js';
import _Sms from '../sms/sms.model.js';
import _StopList from './stopList.js';
import _Streets from './streets.js';
import _TelegramUsers from './telegramUsers.js';

const { DataTypes } = _sequelize;

export default function initModels(sequelize) {
  const Addresses = _Addresses.init(sequelize, DataTypes);
  const Blocks = _Blocks.init(sequelize, DataTypes);
  const Cities = _Cities.init(sequelize, DataTypes);
  const Customers = _Customers.init(sequelize, DataTypes);
  const Deliveries = _Deliveries.init(sequelize, DataTypes);
  const DeliveryTerminals = _DeliveryTerminals.init(sequelize, DataTypes);
  const DeliveryZone = _DeliveryZone.init(sequelize, DataTypes);
  const Devices = _Devices.init(sequelize, DataTypes);
  const ExternalClients = _ExternalClients.init(sequelize, DataTypes);
  const Files = _Files.init(sequelize, DataTypes);
  const Groups = _Groups.init(sequelize, DataTypes);
  const Iiko = _Iiko.init(sequelize, DataTypes);
  const Likes = _Likes.init(sequelize, DataTypes);
  const Notifications = _Notifications.init(sequelize, DataTypes);
  const Options = _Options.init(sequelize, DataTypes);
  const OrderIikoAnswer = _OrderIikoAnswer.init(sequelize, DataTypes);
  const OrderProductModifiers = _OrderProductModifiers.init(sequelize, DataTypes);
  const OrderProducts = _OrderProducts.init(sequelize, DataTypes);
  const OrderSberbank = _OrderSberbank.init(sequelize, DataTypes);
  const Orders = _Orders.init(sequelize, DataTypes);
  const OrderStatusLogs = _OrderStatusLogs.init(sequelize, DataTypes);
  const Pages = _Pages.init(sequelize, DataTypes);
  const PaymentTypes = _PaymentTypes.init(sequelize, DataTypes);
  const ProductGroupModifiers = _ProductGroupModifiers.init(sequelize, DataTypes);
  const ProductGroupModifiersChildren = _ProductGroupModifiersChildren.init(sequelize, DataTypes);
  const ProductModifiers = _ProductModifiers.init(sequelize, DataTypes);
  const Products = _Products.init(sequelize, DataTypes);
  const Promocodes = _Promocodes.init(sequelize, DataTypes);
  const PromocodeUserSegments = _PromocodeUserSegments.init(sequelize, DataTypes);
  const Reviews = _Reviews.init(sequelize, DataTypes);
  const Sberbank = _Sberbank.init(sequelize, DataTypes);
  const Settings = _Settings.init(sequelize, DataTypes);
  const ShopImages = _ShopImages.init(sequelize, DataTypes);
  const Slides = _Slides.init(sequelize, DataTypes);
  const Stories = _Stories.init(sequelize, DataTypes);
  const Sms = _Sms.init(sequelize, DataTypes);
  const StopList = _StopList.init(sequelize, DataTypes);
  const Streets = _Streets.init(sequelize, DataTypes);
  const TelegramUsers = _TelegramUsers.init(sequelize, DataTypes);

  Orders.belongsTo(Addresses, { as: 'address', foreignKey: 'addressId' });
  Addresses.hasMany(Orders, { as: 'orders', foreignKey: 'addressId' });
  Addresses.belongsTo(Customers, { as: 'user', foreignKey: 'userId' });
  Customers.hasMany(Addresses, { as: 'addresses', foreignKey: 'userId' });
  Devices.belongsTo(Customers, { as: 'customer', foreignKey: 'customerId' });
  Customers.hasMany(Devices, { as: 'devices', foreignKey: 'customerId' });
  Likes.belongsTo(Customers, { as: 'user', foreignKey: 'userId' });
  Customers.hasMany(Likes, { as: 'likes', foreignKey: 'userId' });
  Orders.belongsTo(Customers, { as: 'user', foreignKey: 'userId' });
  Customers.hasMany(Orders, { as: 'orders', foreignKey: 'userId' });
  OrderProductModifiers.belongsTo(OrderProducts, { as: 'orderProduct', foreignKey: 'orderProductId' });
  OrderProducts.hasMany(OrderProductModifiers, { as: 'orderProductModifiers', foreignKey: 'orderProductId' });
  OrderIikoAnswer.belongsTo(Orders, { as: 'order', foreignKey: 'orderId' });
  Orders.hasMany(OrderIikoAnswer, { as: 'orderIikoAnswers', foreignKey: 'orderId' });
  OrderProducts.belongsTo(Orders, { as: 'order', foreignKey: 'orderId' });
  Orders.hasMany(OrderProducts, { as: 'orderProducts', foreignKey: 'orderId' });
  OrderSberbank.belongsTo(Orders, { as: 'order', foreignKey: 'orderId' });
  Orders.hasMany(OrderSberbank, { as: 'orderSberbanks', foreignKey: 'orderId' });
  Likes.belongsTo(Products, { as: 'product', foreignKey: 'productId' });
  Products.hasMany(Likes, { as: 'likes', foreignKey: 'productId' });
  OrderStatusLogs.belongsTo(Orders, { as: 'order', foreignKey: 'orderId' });
  Orders.hasMany(OrderStatusLogs, { as: 'statusLogs', foreignKey: 'orderId' });

  Deliveries.belongsTo(Orders, { as: 'order', foreignKey: 'orderId' });
  Orders.hasOne(Deliveries, { as: 'delivery', foreignKey: 'orderId' });

  Promocodes.belongsTo(Files, { as: 'listBanner', foreignKey: 'listBannerId' });
  Files.hasMany(Promocodes, { as: 'listBannerPromocodes', foreignKey: 'listBannerId' });
  Promocodes.belongsTo(Files, { as: 'cardBanner', foreignKey: 'cardBannerId' });
  Files.hasMany(Promocodes, { as: 'cardBannerPromocodes', foreignKey: 'cardBannerId' });


  Promocodes.hasMany(PromocodeUserSegments, { as: 'userSegments', foreignKey: 'promocodeId' });
  PromocodeUserSegments.belongsTo(Promocodes, { as: 'promocode', foreignKey: 'promocodeId' });
  Customers.hasMany(PromocodeUserSegments, { as: 'promocodeSegments', foreignKey: 'userId' });
  PromocodeUserSegments.belongsTo(Customers, { as: 'customer', foreignKey: 'userId' });

  Groups.hasMany(ShopImages, {
    as: 'ShopImages',
    foreignKey: 'ownerId',
    constraints: false,
  });
  ShopImages.belongsTo(Groups, {
    as: 'Owner',
    foreignKey: 'ownerId',
    constraints: false,
  });

  Products.hasMany(ShopImages, {
    as: 'ShopImages',
    foreignKey: 'ownerId',
    constraints: false,
  });
  ShopImages.belongsTo(Products, {
    as: 'ProductOwner',
    foreignKey: 'ownerId',
    constraints: false,
  });

  return {
    Addresses,
    Blocks,
    Cities,
    Customers,
    Deliveries,
    DeliveryTerminals,
    DeliveryZone,
    Devices,
    ExternalClients,
    Files,
    Groups,
    Iiko,
    Likes,
    Notifications,
    Options,
    OrderIikoAnswer,
    OrderProductModifiers,
    OrderProducts,
    OrderSberbank,
    Orders,
    OrderStatusLogs,
    Pages,
    PaymentTypes,
    ProductGroupModifiers,
    ProductGroupModifiersChildren,
    ProductModifiers,
    Products,
    Promocodes,
    PromocodeUserSegments,
    Reviews,
    Sberbank,
    Settings,
    ShopImages,
    Slides,
    Stories,
    Sms,
    StopList,
    Streets,
    TelegramUsers,
  };
}
