#!/usr/bin/env node

import * as orderService from '../order/order.service.js';
import * as likeService from '../like/like.service.js';

const run = async () => {
  try {
    const ordersLastMonthRaw = await orderService.getProductsInOrdersLastMonthGroupUser();
    const ordersLastMonth = ordersLastMonthRaw.map((order) => {
      const { userId, productsIds: productsIdsRAW } = order;
      const productsIds = productsIdsRAW?.split(',');
      const productsCount = productsIds?.reduce((acc, productId) => {
        acc[productId] = acc[productId] ? acc[productId] + 1 : 1;
        return acc;
      }, {});
      const filteredProductsIds = productsIds?.filter((productId) => productsCount[productId] > 1);
      return ({
        userId,
        productsIds: filteredProductsIds,
        productsCount,

      });
    }).filter((order) => order.productsIds?.length > 0);

    for (const order of ordersLastMonth) {
      if (order.productsIds) {
        for (const productId of order.productsIds) {
          try {
            await likeService.createLike({ userId: order.userId, productId });
          } catch (e) {
            // console.log(e);
          }
        }
      }
    }
    // console.log(ordersLastMonth.length);
  } catch (e) {
    // console.log(e);
  }
};

await run();

export default run;
