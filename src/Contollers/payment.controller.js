import Purchase from '../Models/purchase.model.js';
import Withdrawal from '../Models/Withdrawal.model.js';
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { ValidationError, NotFoundError, DatabaseError } from '../Utiles/errors.js';
import { asyncHandler } from '../middlewares/errorHandler.middleware.js';


// Get Teacher Earnings
export const getTeacherEarnings = asyncHandler(async (req, res, next) => {
  try {
    const teacherId = req.user._id;

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
      teacher: new mongoose.Types.ObjectId(teacherId),
      status: 'completed'
    })
      .populate('student', 'firstName lastName email')
      .populate('course', 'title')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        earnings: earnings[0] || { totalEarnings: 0, totalSales: 0, totalRevenue: 0 },
        recentTransactions
      },
      message: 'Teacher earnings retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get Teacher Transactions
export const getTeacherTransactions = asyncHandler(async (req, res, next) => {
  try {
    const teacherId = new mongoose.Types.ObjectId(req.user._id);
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

    res.status(200).json({
      success: true,
      data: {
        transactions,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      },
      message: 'Teacher transactions retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
});

export const getTeacherPaymentStats = asyncHandler(async (req, res, next) => {
  try {
    const teacherId = new mongoose.Types.ObjectId(req.user._id);

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
          teacher: teacherId,
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
      Withdrawal.find({ teacher: teacherId})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    res.status(200).json({
      success: true,
      data: {
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
      },
      message: 'Payment stats retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
});


export const requestWithdrawal = asyncHandler(async (req, res, next) => {
  try {
    const teacherId = req.user._id;
    const { amount, method, stripeAccountId } = req.body;

    // Validate required fields
    if (!amount) {
      throw new ValidationError("Amount is required", "VAL_001");
    }

    if (!method) {
      throw new ValidationError("Payment method is required", "VAL_001");
    }

    if (method === "stripe" && !stripeAccountId) {
      throw new ValidationError("Stripe Account ID is required for Stripe withdrawals", "VAL_001");
    }

    if (amount <= 0) {
      throw new ValidationError("Amount must be greater than zero", "VAL_001");
    }

    // Get teacher's total earnings and withdrawals
    const purchases = await Purchase.find({ teacher: new mongoose.Types.ObjectId(teacherId), status: "completed" });
    const totalEarnings = purchases.reduce((acc, tx) => acc + tx.teacherEarning, 0);

    const withdrawals = await Withdrawal.find({ teacher: new mongoose.Types.ObjectId(teacherId), status: "approved" });
    const totalWithdrawn = withdrawals.reduce((acc, tx) => acc + tx.amount, 0);

    const availableBalance = totalEarnings - totalWithdrawn;

    if (amount > availableBalance) {
      throw new ValidationError(`Insufficient balance. Available: ${availableBalance}`, "VAL_001");
    }

    const withdrawal = await Withdrawal.create({
      teacher: new mongoose.Types.ObjectId(teacherId),
      amount,
      method,
      stripeAccountId: method === "stripe" ? stripeAccountId : undefined,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      data: { withdrawal },
      message: "Withdrawal request submitted successfully"
    });
  } catch (err) {
    next(err);
  }
});
export const getAllWithdrawals = asyncHandler(async (req, res, next) => {
  try {
    // Get the page and limit from the query params, default to page 1 and limit 10 if not provided
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch total number of withdrawals for statistics
    const totalWithdrawalsCount = await Withdrawal.countDocuments();

    // Fetch withdrawal stats (approved, pending, rejected)
    const withdrawalStats = await Withdrawal.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          status: "$_id",
          count: 1,
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
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate total pages
    const totalPages = Math.ceil(totalWithdrawalsCount / limit);

    res.status(200).json({
      success: true,
      data: {
        withdrawals,
        stats,
        pagination: {
          currentPage: page,
          totalPages,
          totalWithdrawalsCount,
        },
      },
      message: 'Withdrawals retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
});



export const updateStripeId = asyncHandler(async (req, res, next) => {
  try {
    const { stripeAccountId, action } = req.body;
    const { id } = req.params;

    // Validate required fields
    if (!action) {
      throw new ValidationError("Action is required (approved/rejected)", "VAL_001");
    }

    if (!['approved', 'rejected'].includes(action)) {
      throw new ValidationError("Action must be either 'approved' or 'rejected'", "VAL_001");
    }

    // Get current date for processedAt
    const processedAt = new Date();

    // Build update object
    const updateData = {
      status: action,
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
      throw new NotFoundError("Withdrawal not found", "RES_001");
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
      from: `"Admin Team" <${process.env.MAIL_USER}>`,
      to: email,
      subject: `Your Withdrawal Status Update`,
      html: `
  <div style="max-width:600px;margin:0 auto;padding:20px;font-family:Arial,sans-serif;border:1px solid #e0e0e0;border-radius:8px;">
    <!-- Header -->
    <div style="background:#28a745;padding:15px;border-radius:8px 8px 0 0;text-align:center;">
      <h2 style="color:white;margin:0;">Withdrawal Status Update</h2>
    </div>

    <!-- Body -->
    <div style="padding:20px;color:#333;line-height:1.6;">
      <p style="font-size:16px;">Dear <strong>${firstName}</strong>,</p>
      <p>Your withdrawal request has been <strong>${withdrawal.status}</strong>.</p>
      <p><strong>Processed At:</strong> ${processedAt}</p>
      ${stripeAccountId ? `<p><strong>Stripe Account ID:</strong> ${stripeAccountId}</p>` : ""}
      <p>If you have any questions, feel free to contact our support team.</p>
    </div>

    <!-- Footer -->
    <div style="background:#f9f9f9;padding:15px;text-align:center;border-top:1px solid #e0e0e0;border-radius:0 0 8px 8px;">
      <p style="margin:0;font-size:14px;color:#666;">
        Best regards,<br/>The Support Team
      </p>
    </div>
  </div>
  `,
    };


    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      data: { withdrawal },
      message: "Withdrawal updated successfully and email sent"
    });
  } catch (err) {
    next(err);
  }
});








