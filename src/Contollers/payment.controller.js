import Purchase from '../Models/purchase.model.js';
import Withdrawal from '../Models/Withdrawal.model.js';
import mongoose from "mongoose";
import nodemailer from "nodemailer";


// Get Teacher Earnings
export const getTeacherEarnings = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const earnings = await Purchase.aggregate([
      {
        $match: {
          teacher: new mongoose.Types.ObjectId(teacherId),
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

    // Extract pagination parameters from query string (default to page 1 and pageSize 10)
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 16;

    const skip = (page - 1) * pageSize;
    const limit = pageSize;

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

    // Fetch all withdrawals (including approved, pending, etc.)
    const withdrawals = await Withdrawal.find({
      teacher: teacherId,
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

    // Fetch recent withdrawals with pagination
    const [totalWithdrawalsCount, recentWithdrawals] = await Promise.all([
      Withdrawal.countDocuments({ teacher: teacherId }), // Get the total number of withdrawals
      Withdrawal.find({ teacher: teacherId })
        .sort({ processedAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    res.json({
      stats: {
        totalRevenue,
        totalEarnings,
        totalWithdrawals,
        currentBalance,
        todayRevenue,
      },
      revenueOverTime,
      recentWithdrawals,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalWithdrawalsCount / pageSize),
        totalWithdrawalsCount,
      },
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
    // Get the page and limit from the query params, default to page 1 and limit 10 if not provided
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit; // Skip the appropriate number of documents for pagination

    // Fetch total number of withdrawals for statistics
    const totalWithdrawalsCount = await Withdrawal.countDocuments();

    // Fetch withdrawal stats (approved, pending, rejected)
    const withdrawalStats = await Withdrawal.aggregate([
      {
        $group: {
          _id: "$status", // Group by status (approved, pending, rejected)
          count: { $sum: 1 }, // Count the number of withdrawals for each status
        },
      },
      {
        $project: {
          _id: 0, // Exclude the _id field
          status: "$_id", // Alias the _id to 'status'
          count: 1, // Include the count
        },
      },
    ]);

    // Format the withdrawal stats into an object
    const stats = {
      approved: 0,
      pending: 0,
      rejected: 0,
    };

    // Map aggregated stats into the stats object
    withdrawalStats.forEach((stat) => {
      if (stat.status === "approved") stats.approved = stat.count;
      if (stat.status === "pending") stats.pending = stat.count;
      if (stat.status === "rejected") stats.rejected = stat.count;
    });

    // Fetch the withdrawals with pagination
    const withdrawals = await Withdrawal.find()
      .populate("teacher", "firstName lastName email")
      .sort({ createdAt: -1 }) // Sort by created date
      .skip(skip) // Skip the appropriate number of withdrawals for pagination
      .limit(limit); // Limit the number of withdrawals per page

    // Calculate total pages
    const totalPages = Math.ceil(totalWithdrawalsCount / limit);

    // Send the response with withdrawals, stats, and pagination details
    res.status(200).json({
      withdrawals,
      stats, // Include stats in the response
      pagination: {
        currentPage: page,
        totalPages,
        totalWithdrawalsCount,
      },
    });
  } catch (err) {
    console.error("Error fetching withdrawals:", err);
    res.status(500).json({ message: "Failed to fetch withdrawals" });
  }
};



export const updateStripeId = async (req, res) => {
  try {
    const { stripeAccountId, action } = req.body; // ✅ separate action
    const { id } = req.params;

    if (!action) {
      return res.status(400).json({ message: "Action is required (approved/rejected)." });
    }

    // Get current date for processedAt
    const processedAt = new Date();

    // Build update object
    const updateData = {
      status: action, // ✅ set status based on action
      processedAt,
    };

    // Only update stripeAccountId if provided
    if (stripeAccountId) {
      updateData.stripeAccountId = stripeAccountId;
    }

    const withdrawal = await Withdrawal.findByIdAndUpdate(id, updateData, {
      new: true,
    }).populate("teacher", "firstName lastName email");

    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal not found" });
    }

    // Send email to teacher
    const { firstName, email } = withdrawal.teacher;

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: Number(process.env.MAIL_PORT) === 465,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Admin Team " <${process.env.MAIL_USER}>`,
      to: email,
      subject: `Your Withdrawal Status Update`,
      html: `
        <h3>Withdrawal Status Update</h3>
        <p><strong>Dear ${firstName},</strong></p>
        <p>Your withdrawal request has been <strong>${withdrawal.status}</strong>.</p>
        <p><strong>Processed At:</strong> ${processedAt}</p>
        ${stripeAccountId ? `<p><strong>Stripe Account ID:</strong> ${stripeAccountId}</p>` : ""}
        <p>If you have any questions, feel free to contact our support team.</p>
        <br/>
        <p>Best regards,</p>
        <p>The Support Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: "Withdrawal updated successfully, and email sent",
      withdrawal,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update withdrawal" });
  }
};








