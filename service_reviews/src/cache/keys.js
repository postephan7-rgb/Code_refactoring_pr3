module.exports = {
    review: (id) => `reviews:review:${id}`,
    byOrder: (orderId) => `reviews:order:${orderId}`,
    avgByProduct: (productId) => `reviews:product:${productId}:avg`,
};