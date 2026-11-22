import mongoose from 'mongoose';
import { MENU_CATEGORIES, MAX_ITEM_PRICE, isSafeHttpUrl } from '../utils/validators.js';

const menuItemSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Menu item name is required'],
      trim: true,
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      max: [MAX_ITEM_PRICE, `Price cannot exceed ${MAX_ITEM_PRICE}`],
    },
    category: {
      type: String,
      enum: MENU_CATEGORIES,
      default: 'Main Course',
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    imageUrl: {
      type: String,
      trim: true,
      maxlength: [500, 'Image URL cannot exceed 500 characters'],
      default: '',
      validate: {
        validator: isSafeHttpUrl,
        message: 'Image URL must be a valid http:// or https:// URL',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

menuItemSchema.index({ organization: 1, category: 1, isAvailable: 1 });
menuItemSchema.index({ organization: 1, name: 1 });

export const MenuItem = mongoose.model('MenuItem', menuItemSchema);
