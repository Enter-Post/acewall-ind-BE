import Purchase from '../Models/purchase.model.js';
import Withdrawal from '../Models/Withdrawal.model.js'; 
import mongoose from "mongoose";

// Get Teacher Earnings
export const getTeacherEarnings = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const earnings = await Purchase.aggregate([
      {
        $match: {
          teacher: new  mongoose.Types.ObjectId(teacherId),
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$teacherEarning' },
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$amount' }
        }
      }
    ]);

    const recentTransactions = await Purchase.find({
      teacher: teacherId,
      status: 'completed'
    })
    .populate('student', 'firstName lastName email')
    .populate('course', 'title')
    .sort({ createdAt: -1 })
    .limit(10);

    res.json({
      earnings: earnings[0] || { totalEarnings: 0, totalSales: 0, totalRevenue: 0 },
      recentTransactions
    });
  } catch (error) {
    console.error('Get teacher earnings error:', error);
    res.status(500).json({ message: 'Failed to fetch earnings' });
  }
};

// Get Teacher Transactions
export const getTeacherTransactions = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { page = 1, limit = 10, status = 'all' } = req.query;

    const filter = { teacher: teacherId };
    if (status !== 'all') {
      filter.status = status;
    }

    const transactions = await Purchase.find(filter)
      .populate('student', 'firstName lastName email')
      .populate('course', 'title price')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Purchase.countDocuments(filter);

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get teacher transactions error:', error);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
};

export const getTeacherPaymentStats = async (req, res) => {
  try {
    const teacherId = req.user.id;

    // Today date range
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch all completed purchases
    const purchases = await Purchase.find({
      teacher: teacherId,
      status: "completed",
    });

    const totalRevenue = purchases.reduce((acc, tx) => acc + tx.amount, 0);
    const totalEarnings = purchases.reduce((acc, tx) => acc + tx.teacherEarning, 0);

    const todayRevenue = purchases
      .filter((tx) =>
        new Date(tx.createdAt) >= startOfDay && new Date(tx.createdAt) <= endOfDay
      )
      .reduce((acc, tx) => acc + tx.teacherEarning, 0);

    // 🆕 Fetch all approved withdrawals
    const withdrawals = await Withdrawal.find({
      teacher: teacherId,
      status: "approved",
    });

    const totalWithdrawals = withdrawals.reduce((acc, tx) => acc + tx.amount, 0);
    const currentBalance = totalEarnings - totalWithdrawals;

    // Revenue over last 30 days
    const revenueOverTime = await Purchase.aggregate([
      {
        $match: {
          teacher: new mongoose.Types.ObjectId(teacherId),
          status: "completed",
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          revenue: { $sum: "$teacherEarning" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: "$_id",
          revenue: 1,
          _id: 0,
        },
      },
    ]);
    
const recentWithdrawals = await Withdrawal.find({
  teacher: teacherId,
  status: "approved",
})
.sort({ processedAt: -1 })
.limit(5); 
    res.json({
      stats: {
        totalRevenue,
        totalEarnings,
        totalWithdrawals,
        currentBalance,
        todayRevenue,
      },
      revenueOverTime,
      recentWithdrawals
    });
  } catch (err) {
    console.error("Error in getTeacherPaymentStats:", err);
    res.status(500).json({ message: "Failed to fetch payment stats" });
  }
};
export const requestWithdrawal = async (req, res) => {
  try {
    const teacherId = req.user.id;
const { amount, method, stripeAccountId } = req.body;
if (method === "stripe" && !stripeAccountId) {
  return res.status(400).json({ message: "Stripe Account ID is required." });
}
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    // Get teacher's total earnings and withdrawals
    const purchases = await Purchase.find({ teacher: teacherId, status: "completed" });
    const totalEarnings = purchases.reduce((acc, tx) => acc + tx.teacherEarning, 0);

    const withdrawals = await Withdrawal.find({ teacher: teacherId, status: "approved" });
    const totalWithdrawn = withdrawals.reduce((acc, tx) => acc + tx.amount, 0);

    const availableBalance = totalEarnings - totalWithdrawn;

    if (amount > availableBalance) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const withdrawal = await Withdrawal.create({
      teacher: teacherId,
      amount,
      method,
        stripeAccountId: method === "stripe" ? stripeAccountId : undefined, // ✅ Save it if method is stripe
      status: "pending",
    });

    res.status(201).json({ message: "Withdrawal request submitted", withdrawal });
  } catch (err) {
    console.error("Withdrawal request error:", err);
    res.status(500).json({ message: "Failed to submit withdrawal" });
  }
};
export const getAllWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find()
      .populate("teacher", "name email") // optional: show teacher details
      .sort({ createdAt: -1 });

    res.status(200).json({ withdrawals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch withdrawals" });
  }
};
export const updateStripeId = async (req, res) => {
  try {
    const { stripeAccountId } = req.body;
    const { id } = req.params;

    const withdrawal = await Withdrawal.findByIdAndUpdate(
      id,
      { stripeAccountId },
      { new: true }
    );

    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal not found" });
    }

    res.status(200).json({ message: "Stripe Account ID updated", withdrawal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update Stripe Account ID" });
  }
};
