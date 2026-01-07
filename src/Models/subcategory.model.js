import mongoose from 'mongoose';

// Subcategory schema
const SubcategorySchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: true,
      trim: true 
    },
    category: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Category', 
      required: true 
    }, // Reference to parent category
    
    // Added Image Object
    image: {
      url: { 
        type: String, 
        default: "" 
      },
      publicId: { 
        type: String, 
        default: "" 
      },
      filename: { 
        type: String 
      }
    },
  },
  { timestamps: true }
);

const Subcategory = mongoose.model('Subcategory', SubcategorySchema);
export default Subcategory;