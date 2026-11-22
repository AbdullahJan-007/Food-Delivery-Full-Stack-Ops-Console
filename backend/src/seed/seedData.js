import { Organization, slugifyOrgName } from '../models/Organization.model.js';
import { User } from '../models/User.model.js';
import { MenuItem } from '../models/MenuItem.model.js';
import { DEFAULT_ORG_SLUG } from '../controllers/auth.controller.js';

export const STARTER_MENU = [
  {
    name: 'Zinger Crunch Burger',
    description: 'Crispy spiced chicken fillet with house sauce',
    price: 650,
    category: 'Main Course',
  },
  {
    name: 'Smoky Beef Smash',
    description: 'Double beef patty, cheddar, caramelized onions',
    price: 890,
    category: 'Main Course',
  },
  {
    name: 'Loaded Masala Fries',
    description: 'Hand-cut fries with garlic mayo & jalapeños',
    price: 320,
    category: 'Sides',
  },
  {
    name: 'Crispy Chicken Wings',
    description: '6pc honey chili glazed wings with ranch dip',
    price: 540,
    category: 'Starters',
  },
  {
    name: 'Mint Margarita',
    description: 'Fresh crushed mint and lime cooler',
    price: 220,
    category: 'Beverages',
  },
  {
    name: 'Molten Lava Cake',
    description: 'Warm chocolate cake with vanilla scoop',
    price: 450,
    category: 'Desserts',
  },
];

export async function ensureSeedData({
  orgName = process.env.ORG_NAME || 'Food Delivery Ops',
  orgSlug = process.env.ORG_SLUG || DEFAULT_ORG_SLUG,
  adminName = process.env.ADMIN_NAME || 'Admin',
  adminEmail = process.env.ADMIN_EMAIL || 'admin@fooddelivery.com',
  adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!',
} = {}) {
  const slug = slugifyOrgName(orgSlug) || DEFAULT_ORG_SLUG;

  let org = await Organization.findOne({ slug });
  if (!org) {
    org = await Organization.create({
      name: orgName,
      slug,
      plan: 'growth',
      currency: 'PKR',
    });
    console.log(`Workspace created: ${org.name} (${org.slug})`);
  }

  let admin = await User.findOne({ email: adminEmail.toLowerCase() });
  if (!admin) {
    admin = await User.create({
      organization: org._id,
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
    });
    console.log(`Admin created: ${admin.email}`);
  }

  const existingItems = await MenuItem.countDocuments({ organization: org._id });
  if (existingItems === 0) {
    await MenuItem.insertMany(
      STARTER_MENU.map((item) => ({
        ...item,
        organization: org._id,
        createdBy: admin._id,
      }))
    );
    console.log(`Seeded ${STARTER_MENU.length} starter menu items.`);
  }

  return { org, admin };
}
