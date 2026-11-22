import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Organization, slugifyOrgName } from '../models/Organization.model.js';
import { User } from '../models/User.model.js';
import { MenuItem } from '../models/MenuItem.model.js';
import { DEFAULT_ORG_SLUG } from '../controllers/auth.controller.js';

const STARTER_MENU = [
  { name: 'Zinger Crunch Burger', description: 'Crispy spiced chicken fillet with house sauce', price: 650, category: 'Main Course' },
  { name: 'Smoky Beef Smash', description: 'Double beef patty, cheddar, caramelized onions', price: 890, category: 'Main Course' },
  { name: 'Loaded Masala Fries', description: 'Hand-cut fries with garlic mayo & jalapeños', price: 320, category: 'Sides' },
  { name: 'Mint Margarita', description: 'Fresh crushed mint and lime cooler', price: 220, category: 'Beverages' },
  { name: 'Molten Lava Cake', description: 'Warm chocolate cake with vanilla scoop', price: 450, category: 'Desserts' },
];

async function seedAdmin() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, ORG_NAME, ORG_SLUG } = process.env;

  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in .env before seeding.');
    process.exit(1);
  }

  await connectDB();

  const slug = ORG_SLUG ? slugifyOrgName(ORG_SLUG) : DEFAULT_ORG_SLUG;
  let org = await Organization.findOne({ slug });
  if (!org) {
    org = await Organization.create({
      name: ORG_NAME || 'Food Delivery Ops',
      slug,
      plan: 'growth',
      currency: 'PKR',
    });
    console.log(`Workspace created: ${org.name} (${org.slug})`);
  } else {
    console.log(`Workspace already exists: ${org.name} (${org.slug})`);
  }

  let admin = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (admin) {
    console.log(`Admin already exists: ${admin.email}`);
  } else {
    admin = await User.create({
      organization: org._id,
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
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

  await mongoose.disconnect();
  process.exit(0);
}

seedAdmin();
