export const TOWNS = [
  "Nairobi", "Mombasa", "Kisumu", "Eldoret", "Nakuru", "Thika", "Kiambu",
  "Nyeri", "Meru", "Kakamega", "Kitale", "Machakos", "Naivasha", "Kericho",
  "Bungoma", "Malindi", "Embu", "Kerugoya", "Voi", "Isiolo", "Kitui",
  "Homa Bay", "Migori", "Narok", "Nanyuki", "Kapsabet", "Webuye", "Athi River",
];

const MANUFACTURING_PRODUCTS = [
  "Tea", "Coffee", "Dairy", "Grain", "Leather", "Sisal", "Honey", "Fish",
  "Wheat", "Macadamia", "Maize", "Hides & Skins", "Cashew", "Sugar",
  "Textile", "Ceramic", "Furniture", "Soap", "Animal Feed", "Packaging",
  "Avocado", "Cotton", "Bamboo", "Charcoal Briquette", "Banana Fibre",
  "Pyrethrum", "Cassava", "Groundnut", "Sunflower Oil", "Jam & Preserve",
];

const MANUFACTURING_SUFFIXES = [
  "Processors", "Millers", "Industries Ltd", "Cooperative", "Factory",
  "Mills Ltd", "Works", "Products Ltd", "Processors Ltd", "Cooperative Union",
];

const ECOMMERCE_CATEGORIES = [
  "Fashion", "Electronics", "Auto Parts", "Furniture", "Beauty", "Phone Accessories",
  "Fabrics", "Farm Supplies", "Home & Garden", "Tyres", "General Store",
  "Stationery", "Kids Wear", "Beachwear", "Hardware", "Solar", "Fishing Gear",
  "Maasai Crafts", "Agro Supplies", "Baby Products", "Sportswear", "Bookshop",
  "Pet Supplies", "Kitchenware", "Office Supplies", "Wellness", "Gift Shop",
];

const ECOMMERCE_SUFFIXES = [
  "Online", "Direct", "Hub", "Store", "Mall", "Shop", "Express", "Outlet",
];

const FIRST_NAMES = [
  "Wanjiru", "Kamau", "Achieng", "Otieno", "Naliaka", "Mutiso", "Chebet",
  "Kiprop", "Njeri", "Odinga", "Wambui", "Mwangi", "Akinyi", "Korir",
  "Nyambura", "Onyango", "Cherono", "Macharia", "Atieno", "Kipchoge",
  "Wairimu", "Omondi", "Jepkemboi", "Maina", "Adhiambo", "Rotich",
];

const LAST_NAMES = [
  "Kariuki", "Ouma", "Sang", "Njoroge", "Auma", "Kibet", "Wafula", "Mbugua",
  "Owino", "Cheruiyot", "Gitau", "Atieno", "Langat", "Nduati", "Wekesa",
  "Muthoni", "Ndegwa", "Tanui", "Kemboi", "Waweru",
];

export function manufacturingName(town: string, rand: () => number): string {
  const product = MANUFACTURING_PRODUCTS[Math.floor(rand() * MANUFACTURING_PRODUCTS.length)];
  const suffix = MANUFACTURING_SUFFIXES[Math.floor(rand() * MANUFACTURING_SUFFIXES.length)];
  return `${town} ${product} ${suffix}`;
}

export function ecommerceName(town: string, rand: () => number): string {
  const category = ECOMMERCE_CATEGORIES[Math.floor(rand() * ECOMMERCE_CATEGORIES.length)];
  const suffix = ECOMMERCE_SUFFIXES[Math.floor(rand() * ECOMMERCE_SUFFIXES.length)];
  return `${town} ${category} ${suffix}`;
}

export function founderName(rand: () => number): string {
  const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
