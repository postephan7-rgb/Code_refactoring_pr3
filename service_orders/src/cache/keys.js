module.exports = {
    order: (id) => `orders:order:${id}`,
    all: () => `orders:all`,
    byUser: (userId) => `orders:user:${userId}`,
};