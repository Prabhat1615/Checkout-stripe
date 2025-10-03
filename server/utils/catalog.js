const { upsertProducts } = require('../ordersDb_mongo');

async function syncElectronicsCatalog() {
  try {
    const urls = [
      'https://dummyjson.com/products/category/smartphones',
      'https://dummyjson.com/products/category/laptops',
    ];
    const responses = await Promise.all(urls.map((u) => fetch(u)));
    if (!responses.every((r) => r.ok)) throw new Error('Failed to fetch DummyJSON');
    const jsons = await Promise.all(responses.map((r) => r.json()));
    const products = jsons
      .flatMap((j) => j.products || [])
      .map((p) => ({
        id: `dj_${p.id}`,
        name: p.title,
        price: Math.round((p.price || 0) * 100),
        image: Array.isArray(p.images) && p.images.length ? p.images[0] : p.thumbnail || null,
        category: p.category || 'electronics',
      }));
    await upsertProducts(products);
  } catch (e) {
    console.warn('Catalog sync failed:', e.message);
  }
}

module.exports = { syncElectronicsCatalog };
