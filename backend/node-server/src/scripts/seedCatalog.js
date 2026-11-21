const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const ProductCatalog = require("../models/ProductCatalog");
const PlatformListing = require("../models/PlatformListing");
const CacheWarmTarget = require("../models/CacheWarmTarget");

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/buywise";

const canonicalProducts = [
  // ==========================================
  // 1. ICE CREAM (AMUL vs MOTHER DAIRY)
  // ==========================================
  {
    _id: "amul_vanilla_magic",
    category: "dairy",
    generic_name: "ice cream",
    product_name: "Vanilla Magic",
    brand: "Amul",
    attributes: { flavour: "vanilla", type: "frozen dessert" },
    search_keywords: ["ice cream", "icecream", "amul ice cream", "amul vanilla", "vanilla magic", "amul vanilla magic"],
    velocity_tier: "moderate",
    refresh_ttl_seconds: 300,
    variants: [
      {
        variant_id: "amul_vanilla_magic_500ml",
        pack_quantity: "500 ml",
        normalized_quantity: 500,
        dimension: "volume",
        base_unit: "ml",
        is_active: true
      },
      {
        variant_id: "amul_vanilla_magic_1l",
        pack_quantity: "1 L",
        normalized_quantity: 1000,
        dimension: "volume",
        base_unit: "ml",
        is_active: true
      }
    ]
  },
  {
    _id: "amul_belgian_chocolate",
    category: "dairy",
    generic_name: "ice cream",
    product_name: "Belgian Chocolate",
    brand: "Amul",
    attributes: { flavour: "chocolate", type: "frozen dessert" },
    search_keywords: ["ice cream", "amul chocolate ice cream", "amul belgian chocolate", "chocolate tub"],
    velocity_tier: "moderate",
    refresh_ttl_seconds: 300,
    variants: [
      {
        variant_id: "amul_belgian_chocolate_500ml",
        pack_quantity: "500 ml",
        normalized_quantity: 500,
        dimension: "volume",
        base_unit: "ml",
        is_active: true
      },
      {
        variant_id: "amul_belgian_chocolate_1l",
        pack_quantity: "1 L",
        normalized_quantity: 1000,
        dimension: "volume",
        base_unit: "ml",
        is_active: true
      }
    ]
  },
  {
    _id: "motherdairy_classic_vanilla",
    category: "dairy",
    generic_name: "ice cream",
    product_name: "Classic Vanilla",
    brand: "Mother Dairy",
    attributes: { flavour: "vanilla", type: "ice cream" },
    search_keywords: ["ice cream", "mother dairy ice cream", "mother dairy vanilla", "classic vanilla tub"],
    velocity_tier: "moderate",
    refresh_ttl_seconds: 300,
    variants: [
      {
        variant_id: "motherdairy_classic_vanilla_500ml",
        pack_quantity: "500 ml",
        normalized_quantity: 500,
        dimension: "volume",
        base_unit: "ml",
        is_active: true
      },
      {
        variant_id: "motherdairy_classic_vanilla_750ml",
        pack_quantity: "750 ml",
        normalized_quantity: 750,
        dimension: "volume",
        base_unit: "ml",
        is_active: true
      }
    ]
  },
  {
    _id: "motherdairy_belgian_chocolate",
    category: "dairy",
    generic_name: "ice cream",
    product_name: "Belgian Chocolate",
    brand: "Mother Dairy",
    attributes: { flavour: "chocolate", type: "ice cream" },
    search_keywords: ["ice cream", "mother dairy chocolate", "mother dairy belgian chocolate"],
    velocity_tier: "moderate",
    refresh_ttl_seconds: 300,
    variants: [
      {
        variant_id: "motherdairy_belgian_chocolate_500ml",
        pack_quantity: "500 ml",
        normalized_quantity: 500,
        dimension: "volume",
        base_unit: "ml",
        is_active: true
      }
    ]
  },

  // ==========================================
  // 2. MILK (HIGH VELOCITY)
  // ==========================================
  {
    _id: "amul_taaza_milk",
    category: "dairy",
    generic_name: "milk",
    product_name: "Taaza Fresh Toned Milk",
    brand: "Amul",
    attributes: { fat: "toned", treatment: "pasteurised" },
    search_keywords: ["milk", "amul milk", "amul taaza", "toned milk", "taaza 500ml"],
    velocity_tier: "high",
    refresh_ttl_seconds: 120,
    variants: [
      {
        variant_id: "amul_taaza_500ml",
        pack_quantity: "500 ml",
        normalized_quantity: 500,
        dimension: "volume",
        base_unit: "ml",
        is_active: true
      },
      {
        variant_id: "amul_taaza_1l",
        pack_quantity: "1 L",
        normalized_quantity: 1000,
        dimension: "volume",
        base_unit: "ml",
        is_active: true
      }
    ]
  },
  {
    _id: "amul_gold_milk",
    category: "dairy",
    generic_name: "milk",
    product_name: "Gold Full Cream Milk",
    brand: "Amul",
    attributes: { fat: "full cream", treatment: "pasteurised" },
    search_keywords: ["milk", "amul gold", "full cream milk", "gold milk"],
    velocity_tier: "high",
    refresh_ttl_seconds: 120,
    variants: [
      {
        variant_id: "amul_gold_500ml",
        pack_quantity: "500 ml",
        normalized_quantity: 500,
        dimension: "volume",
        base_unit: "ml",
        is_active: true
      },
      {
        variant_id: "amul_gold_1l",
        pack_quantity: "1 L",
        normalized_quantity: 1000,
        dimension: "volume",
        base_unit: "ml",
        is_active: true
      }
    ]
  },
  {
    _id: "motherdairy_toned_milk",
    category: "dairy",
    generic_name: "milk",
    product_name: "Toned Fresh Milk",
    brand: "Mother Dairy",
    attributes: { fat: "toned", treatment: "pasteurised" },
    search_keywords: ["milk", "mother dairy milk", "mother dairy toned milk"],
    velocity_tier: "high",
    refresh_ttl_seconds: 120,
    variants: [
      {
        variant_id: "motherdairy_toned_500ml",
        pack_quantity: "500 ml",
        normalized_quantity: 500,
        dimension: "volume",
        base_unit: "ml",
        is_active: true
      },
      {
        variant_id: "motherdairy_toned_1l",
        pack_quantity: "1 L",
        normalized_quantity: 1000,
        dimension: "volume",
        base_unit: "ml",
        is_active: true
      }
    ]
  },
  {
    _id: "nandini_toned_milk",
    category: "dairy",
    generic_name: "milk",
    product_name: "Toned Fresh Milk",
    brand: "Nandini",
    attributes: { fat: "toned", treatment: "pasteurised" },
    search_keywords: ["milk", "nandini milk", "nandini toned milk"],
    velocity_tier: "high",
    refresh_ttl_seconds: 120,
    variants: [
      {
        variant_id: "nandini_toned_500ml",
        pack_quantity: "500 ml",
        normalized_quantity: 500,
        dimension: "volume",
        base_unit: "ml",
        is_active: true
      }
    ]
  },

  // ==========================================
  // 3. BREAD (HIGH VELOCITY)
  // ==========================================
  {
    _id: "britannia_white_bread",
    category: "bakery",
    generic_name: "bread",
    product_name: "Daily Fresh White Bread",
    brand: "Britannia",
    attributes: { type: "white", grain: "maida" },
    search_keywords: ["bread", "britannia bread", "white bread", "sandwich bread"],
    velocity_tier: "high",
    refresh_ttl_seconds: 120,
    variants: [
      {
        variant_id: "britannia_white_bread_400g",
        pack_quantity: "400 g",
        normalized_quantity: 400,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      },
      {
        variant_id: "britannia_white_bread_700g",
        pack_quantity: "700 g",
        normalized_quantity: 700,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      }
    ]
  },
  {
    _id: "britannia_brown_bread",
    category: "bakery",
    generic_name: "bread",
    product_name: "100% Whole Wheat Brown Bread",
    brand: "Britannia",
    attributes: { type: "brown", grain: "whole wheat" },
    search_keywords: ["bread", "brown bread", "britannia brown bread", "atta bread"],
    velocity_tier: "high",
    refresh_ttl_seconds: 120,
    variants: [
      {
        variant_id: "britannia_brown_bread_400g",
        pack_quantity: "400 g",
        normalized_quantity: 400,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      }
    ]
  },
  {
    _id: "english_oven_white_bread",
    category: "bakery",
    generic_name: "bread",
    product_name: "Premium White Bread",
    brand: "English Oven",
    attributes: { type: "white", grain: "maida" },
    search_keywords: ["bread", "english oven bread", "english oven white"],
    velocity_tier: "high",
    refresh_ttl_seconds: 120,
    variants: [
      {
        variant_id: "english_oven_white_400g",
        pack_quantity: "400 g",
        normalized_quantity: 400,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      }
    ]
  },

  // ==========================================
  // 4. BUTTER & CHEESE & PANEER
  // ==========================================
  {
    _id: "amul_pasteurised_butter",
    category: "dairy",
    generic_name: "butter",
    product_name: "Pasteurised Salted Butter",
    brand: "Amul",
    attributes: { salt: "salted" },
    search_keywords: ["butter", "amul butter", "amul salted butter"],
    velocity_tier: "high",
    refresh_ttl_seconds: 120,
    variants: [
      {
        variant_id: "amul_butter_100g",
        pack_quantity: "100 g",
        normalized_quantity: 100,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      },
      {
        variant_id: "amul_butter_500g",
        pack_quantity: "500 g",
        normalized_quantity: 500,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      }
    ]
  },
  {
    _id: "amul_masti_curd",
    category: "dairy",
    generic_name: "curd",
    product_name: "Masti Dahi",
    brand: "Amul",
    attributes: { type: "curd" },
    search_keywords: ["curd", "dahi", "amul dahi", "amul curd", "masti dahi"],
    velocity_tier: "high",
    refresh_ttl_seconds: 120,
    variants: [
      {
        variant_id: "amul_masti_curd_200g",
        pack_quantity: "200 g",
        normalized_quantity: 200,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      },
      {
        variant_id: "amul_masti_curd_400g",
        pack_quantity: "400 g",
        normalized_quantity: 400,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      }
    ]
  },
  {
    _id: "amul_malai_paneer",
    category: "dairy",
    generic_name: "paneer",
    product_name: "Fresh Malai Paneer",
    brand: "Amul",
    attributes: { type: "fresh paneer" },
    search_keywords: ["paneer", "amul paneer", "malai paneer"],
    velocity_tier: "high",
    refresh_ttl_seconds: 120,
    variants: [
      {
        variant_id: "amul_paneer_200g",
        pack_quantity: "200 g",
        normalized_quantity: 200,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      }
    ]
  },
  {
    _id: "amul_processed_cheese",
    category: "dairy",
    generic_name: "cheese",
    product_name: "Processed Cheese Block",
    brand: "Amul",
    attributes: { type: "processed cheese" },
    search_keywords: ["cheese", "amul cheese", "cheese cubes", "cheese block"],
    velocity_tier: "high",
    refresh_ttl_seconds: 120,
    variants: [
      {
        variant_id: "amul_cheese_200g",
        pack_quantity: "200 g",
        normalized_quantity: 200,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      }
    ]
  },

  // ==========================================
  // 5. EGGS & PRODUCE
  // ==========================================
  {
    _id: "fresh_white_eggs",
    category: "poultry",
    generic_name: "eggs",
    product_name: "Farm Fresh White Eggs",
    brand: "Farm Fresh",
    attributes: { color: "white" },
    search_keywords: ["eggs", "egg", "white eggs", "farm eggs"],
    velocity_tier: "high",
    refresh_ttl_seconds: 120,
    variants: [
      {
        variant_id: "farm_fresh_eggs_6pc",
        pack_quantity: "6 pieces",
        normalized_quantity: 6,
        dimension: "count",
        base_unit: "piece",
        is_active: true
      },
      {
        variant_id: "farm_fresh_eggs_12pc",
        pack_quantity: "12 pieces",
        normalized_quantity: 12,
        dimension: "count",
        base_unit: "piece",
        is_active: true
      },
      {
        variant_id: "farm_fresh_eggs_30pc",
        pack_quantity: "30 pieces",
        normalized_quantity: 30,
        dimension: "count",
        base_unit: "piece",
        is_active: true
      }
    ]
  },
  {
    _id: "fresh_red_onion",
    category: "produce",
    generic_name: "onion",
    product_name: "Fresh Red Onion",
    brand: "Farm Fresh",
    attributes: { origin: "Nashik" },
    search_keywords: ["onion", "pyaz", "red onion", "fresh onion"],
    velocity_tier: "high",
    refresh_ttl_seconds: 120,
    variants: [
      {
        variant_id: "fresh_onion_1kg",
        pack_quantity: "1 kg",
        normalized_quantity: 1000,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      },
      {
        variant_id: "fresh_onion_2kg",
        pack_quantity: "2 kg",
        normalized_quantity: 2000,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      }
    ]
  },
  {
    _id: "fresh_potato",
    category: "produce",
    generic_name: "potato",
    product_name: "Fresh Potato",
    brand: "Farm Fresh",
    attributes: { type: "regular" },
    search_keywords: ["potato", "aloo", "fresh potato"],
    velocity_tier: "high",
    refresh_ttl_seconds: 120,
    variants: [
      {
        variant_id: "fresh_potato_1kg",
        pack_quantity: "1 kg",
        normalized_quantity: 1000,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      }
    ]
  },
  {
    _id: "fresh_tomato",
    category: "produce",
    generic_name: "tomato",
    product_name: "Fresh Hybrid Tomato",
    brand: "Farm Fresh",
    attributes: { type: "hybrid" },
    search_keywords: ["tomato", "tamatar", "fresh tomato", "hybrid tomato"],
    velocity_tier: "high",
    refresh_ttl_seconds: 120,
    variants: [
      {
        variant_id: "fresh_tomato_500g",
        pack_quantity: "500 g",
        normalized_quantity: 500,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      },
      {
        variant_id: "fresh_tomato_1kg",
        pack_quantity: "1 kg",
        normalized_quantity: 1000,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      }
    ]
  },

  // ==========================================
  // 6. STAPLES (TEA, COFFEE, NOODLES, ATTA, RICE, OIL)
  // ==========================================
  {
    _id: "tata_tea_premium",
    category: "beverages",
    generic_name: "tea",
    product_name: "Desh Ki Chai Premium Leaf Tea",
    brand: "Tata Tea",
    attributes: { blend: "assam leaf" },
    search_keywords: ["tea", "chai", "tata tea", "tata tea premium"],
    velocity_tier: "moderate",
    refresh_ttl_seconds: 300,
    variants: [
      {
        variant_id: "tata_tea_premium_250g",
        pack_quantity: "250 g",
        normalized_quantity: 250,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      },
      {
        variant_id: "tata_tea_premium_500g",
        pack_quantity: "500 g",
        normalized_quantity: 500,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      },
      {
        variant_id: "tata_tea_premium_1kg",
        pack_quantity: "1 kg",
        normalized_quantity: 1000,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      }
    ]
  },
  {
    _id: "nescafe_classic_coffee",
    category: "beverages",
    generic_name: "coffee",
    product_name: "Classic Instant Coffee",
    brand: "Nescafe",
    attributes: { roast: "medium" },
    search_keywords: ["coffee", "nescafe", "instant coffee", "nescafe classic"],
    velocity_tier: "moderate",
    refresh_ttl_seconds: 300,
    variants: [
      {
        variant_id: "nescafe_classic_50g",
        pack_quantity: "50 g",
        normalized_quantity: 50,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      },
      {
        variant_id: "nescafe_classic_100g",
        pack_quantity: "100 g",
        normalized_quantity: 100,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      }
    ]
  },
  {
    _id: "nestle_maggi_noodles",
    category: "instant_food",
    generic_name: "maggi",
    product_name: "2-Minute Masala Instant Noodles",
    brand: "Nestle",
    attributes: { flavour: "masala" },
    search_keywords: ["maggi", "noodles", "maggi noodles", "nestle maggi"],
    velocity_tier: "moderate",
    refresh_ttl_seconds: 300,
    variants: [
      {
        variant_id: "nestle_maggi_70g",
        pack_quantity: "70 g",
        normalized_quantity: 70,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      },
      {
        variant_id: "nestle_maggi_420g",
        pack_quantity: "420 g",
        normalized_quantity: 420,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      }
    ]
  },
  {
    _id: "aashirvaad_shudh_chakki_atta",
    category: "staples",
    generic_name: "atta",
    product_name: "Shudh Chakki Whole Wheat Atta",
    brand: "Aashirvaad",
    attributes: { grain: "100% whole wheat" },
    search_keywords: ["atta", "aashirvaad atta", "wheat flour", "chakki atta"],
    velocity_tier: "moderate",
    refresh_ttl_seconds: 300,
    variants: [
      {
        variant_id: "aashirvaad_atta_1kg",
        pack_quantity: "1 kg",
        normalized_quantity: 1000,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      },
      {
        variant_id: "aashirvaad_atta_5kg",
        pack_quantity: "5 kg",
        normalized_quantity: 5000,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      }
    ]
  },
  {
    _id: "india_gate_basmati_rice",
    category: "staples",
    generic_name: "rice",
    product_name: "Basmati Rice Feast Rozzana",
    brand: "India Gate",
    attributes: { grain_length: "medium" },
    search_keywords: ["rice", "basmati rice", "india gate rice", "rozzana basmati"],
    velocity_tier: "moderate",
    refresh_ttl_seconds: 300,
    variants: [
      {
        variant_id: "india_gate_rice_1kg",
        pack_quantity: "1 kg",
        normalized_quantity: 1000,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      },
      {
        variant_id: "india_gate_rice_5kg",
        pack_quantity: "5 kg",
        normalized_quantity: 5000,
        dimension: "weight",
        base_unit: "g",
        is_active: true
      }
    ]
  },
  {
    _id: "fortune_sunflower_oil",
    category: "staples",
    generic_name: "oil",
    product_name: "Sunlite Refined Sunflower Oil",
    brand: "Fortune",
    attributes: { oil_type: "sunflower" },
    search_keywords: ["oil", "cooking oil", "fortune oil", "sunflower oil"],
    velocity_tier: "moderate",
    refresh_ttl_seconds: 300,
    variants: [
      {
        variant_id: "fortune_sunflower_1l",
        pack_quantity: "1 L",
        normalized_quantity: 1000,
        dimension: "volume",
        base_unit: "ml",
        is_active: true
      }
    ]
  }
];

// Sample Platform Listings mapped to canonical variants
const samplePlatformListings = [
  // Amul Vanilla Magic 500ml listings
  {
    canonical_product_id: "amul_vanilla_magic",
    variant_id: "amul_vanilla_magic_500ml",
    platform: "blinkit",
    platform_product_id: "blk_34821",
    platform_product_name: "Amul Vanilla Magic Ice Cream Tub (500 ml)",
    product_url: "https://blinkit.com/prn/amul-vanilla-magic-ice-cream-tub/prid/34821",
    match_confidence: 0.99,
    is_active: true
  },
  {
    canonical_product_id: "amul_vanilla_magic",
    variant_id: "amul_vanilla_magic_500ml",
    platform: "zepto",
    platform_product_id: "zpt_77219",
    platform_product_name: "Amul Real Ice Cream - Vanilla Magic 500ml",
    product_url: "https://www.zeptonow.com/pn/amul-real-ice-cream-vanilla-magic/77219",
    match_confidence: 0.98,
    is_active: true
  },
  {
    canonical_product_id: "amul_vanilla_magic",
    variant_id: "amul_vanilla_magic_500ml",
    platform: "bigbasket",
    platform_product_id: "bb_120489",
    platform_product_name: "Amul Ice Cream - Vanilla Magic, 500 ml Tub",
    product_url: "https://www.bigbasket.com/pd/120489/amul-ice-cream-vanilla-magic-500-ml/",
    match_confidence: 0.99,
    is_active: true
  },
  {
    canonical_product_id: "amul_vanilla_magic",
    variant_id: "amul_vanilla_magic_500ml",
    platform: "jiomart",
    platform_product_id: "jm_590123",
    platform_product_name: "Amul Vanilla Magic Ice Cream 500 ml",
    product_url: "https://www.jiomart.com/p/groceries/amul-vanilla-magic-ice-cream-500-ml/590123",
    match_confidence: 0.97,
    is_active: true
  },

  // Mother Dairy Classic Vanilla 500ml listings
  {
    canonical_product_id: "motherdairy_classic_vanilla",
    variant_id: "motherdairy_classic_vanilla_500ml",
    platform: "blinkit",
    platform_product_id: "blk_48102",
    platform_product_name: "Mother Dairy Classic Vanilla Ice Cream (500 ml)",
    product_url: "https://blinkit.com/prn/mother-dairy-classic-vanilla/prid/48102",
    match_confidence: 0.99,
    is_active: true
  },
  {
    canonical_product_id: "motherdairy_classic_vanilla",
    variant_id: "motherdairy_classic_vanilla_500ml",
    platform: "zepto",
    platform_product_id: "zpt_91032",
    platform_product_name: "Mother Dairy Classic Vanilla Ice Cream Tub 500 ml",
    product_url: "https://www.zeptonow.com/pn/mother-dairy-classic-vanilla/91032",
    match_confidence: 0.98,
    is_active: true
  },

  // Amul Taaza 500ml listings
  {
    canonical_product_id: "amul_taaza_milk",
    variant_id: "amul_taaza_500ml",
    platform: "blinkit",
    platform_product_id: "blk_101",
    platform_product_name: "Amul Taaza Toned Fresh Milk (500 ml)",
    product_url: "https://blinkit.com/prn/amul-taaza-toned-fresh-milk/prid/101",
    match_confidence: 1.0,
    is_active: true
  },
  {
    canonical_product_id: "amul_taaza_milk",
    variant_id: "amul_taaza_500ml",
    platform: "zepto",
    platform_product_id: "zpt_101",
    platform_product_name: "Amul Taaza Toned Milk Pouch 500ml",
    product_url: "https://www.zeptonow.com/pn/amul-taaza-toned-milk/101",
    match_confidence: 1.0,
    is_active: true
  }
];

// Cache warming targets
const sampleCacheWarmTargets = [
  {
    canonical_product_id: "amul_taaza_milk",
    variant_ids: ["amul_taaza_500ml", "amul_taaza_1l"],
    search_term: "milk",
    priority: 1,
    search_frequency: 500,
    enabled: true
  },
  {
    canonical_product_id: "britannia_white_bread",
    variant_ids: ["britannia_white_bread_400g"],
    search_term: "bread",
    priority: 1,
    search_frequency: 450,
    enabled: true
  },
  {
    canonical_product_id: "fresh_white_eggs",
    variant_ids: ["farm_fresh_eggs_6pc", "farm_fresh_eggs_12pc"],
    search_term: "eggs",
    priority: 1,
    search_frequency: 400,
    enabled: true
  },
  {
    canonical_product_id: "amul_pasteurised_butter",
    variant_ids: ["amul_butter_100g", "amul_butter_500g"],
    search_term: "butter",
    priority: 1,
    search_frequency: 380,
    enabled: true
  },
  {
    canonical_product_id: "amul_vanilla_magic",
    variant_ids: ["amul_vanilla_magic_500ml", "amul_vanilla_magic_1l"],
    search_term: "amul ice cream",
    priority: 2,
    search_frequency: 180,
    enabled: true
  },
  {
    canonical_product_id: "motherdairy_classic_vanilla",
    variant_ids: ["motherdairy_classic_vanilla_500ml"],
    search_term: "mother dairy ice cream",
    priority: 2,
    search_frequency: 160,
    enabled: true
  },
  {
    canonical_product_id: "tata_tea_premium",
    variant_ids: ["tata_tea_premium_250g", "tata_tea_premium_500g"],
    search_term: "tea",
    priority: 2,
    search_frequency: 220,
    enabled: true
  },
  {
    canonical_product_id: "nestle_maggi_noodles",
    variant_ids: ["nestle_maggi_70g", "nestle_maggi_420g"],
    search_term: "maggi",
    priority: 2,
    search_frequency: 240,
    enabled: true
  }
];

async function seedDatabase() {
  try {
    console.log(`Connecting to MongoDB at: ${mongoUri}...`);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log("Connected successfully to MongoDB.");

    // 1. Seed Product Catalog
    console.log("\nSeeding Product Catalog...");
    for (const prod of canonicalProducts) {
      await ProductCatalog.findByIdAndUpdate(
        prod._id,
        prod,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`  ✓ Canonical Product: [${prod.brand}] ${prod.product_name} (${prod.generic_name}) - ${prod.variants.length} variant(s)`);
    }

    // 2. Seed Platform Listings
    console.log("\nSeeding Platform Listings...");
    for (const listing of samplePlatformListings) {
      await PlatformListing.findOneAndUpdate(
        {
          variant_id: listing.variant_id,
          platform: listing.platform
        },
        listing,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`  ✓ Platform Listing: [${listing.platform.toUpperCase()}] ${listing.platform_product_name}`);
    }

    // 3. Seed Cache Warm Targets
    console.log("\nSeeding Cache Warm Targets...");
    for (const target of sampleCacheWarmTargets) {
      await CacheWarmTarget.findOneAndUpdate(
        {
          search_term: target.search_term
        },
        target,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`  ✓ Warm Target: '${target.search_term}' (priority=${target.priority}, canonical_id=${target.canonical_product_id})`);
    }

    const catalogCount = await ProductCatalog.countDocuments();
    const listingsCount = await PlatformListing.countDocuments();
    const warmTargetsCount = await CacheWarmTarget.countDocuments();

    console.log("\n==========================================");
    console.log("DATABASE SEED COMPLETED SUCCESSFULLY!");
    console.log(`• Total Canonical Products: ${catalogCount}`);
    console.log(`• Total Platform Listings:  ${listingsCount}`);
    console.log(`• Total Cache Warm Targets: ${warmTargetsCount}`);
    console.log("==========================================\n");

  } catch (error) {
    console.error("Error seeding MongoDB:", error);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
