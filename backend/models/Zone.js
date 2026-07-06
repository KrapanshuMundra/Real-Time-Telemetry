import mongoose from 'mongoose';

const ZoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    description: {
      type: String,
      default: ''
    },
    devices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device'
      }
    ]
  },
  {
    timestamps: true
  }
);

const Zone = mongoose.model('Zone', ZoneSchema);
export default Zone;
