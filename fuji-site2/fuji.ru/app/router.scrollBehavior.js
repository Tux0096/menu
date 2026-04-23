export default function (to, from, savedPosition) {
  if (to.hash === '#top-of-catalog') {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve({
          selector: '#top-of-catalog',
          offset: { x: 0, y: 100 },
        });
      }, 1000);
    });
  }

  if (to.hash?.length > 1) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve({
          selector: to.hash,
          offset: { x: 0, y: 100 },
        });
      }, 500);
    });
  }
  return { x: 0, y: 0 };
}
