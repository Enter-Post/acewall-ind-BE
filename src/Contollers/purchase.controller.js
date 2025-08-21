import Purchase from "../Models/purchase.model.js";
// import User from "../Models/user.model";

export const purchaseCourse = async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;

  try {
    // Check if course is already purchased

    const isPurchased = await Purchase.findOne({ student: userId, course: id });
    if (isPurchased) {
      return res
        .status(400)
        .json({ error: "You have already purchased this course." });
    }

    console.log(isPurchased, "isPurchased");

    const newPurchase = new Purchase({
      student: userId,
      course: id,
    });

    await newPurchase.save();

    return res.status(200).json({
      message: "Course purchased successfully!",
      purchased: newPurchase, // Return updated purchased list
    });
  } catch (error) {
    console.error("Error purchasing course:", error.message);
    return res
      .status(500)
      .json({ error: "Server error while purchasing course." });
  }
};

export const getPurchasedCourses = async (req, res) => {
  const userId = req.user._id;

  try {
    const purchasedCourses = await Purchase.find({ student: userId })
      .populate("course")
      .exec();

    return res.status(200).json({
      message: "Purchased courses fetched successfully!",
      purchasedCourses,
    });
  } catch (error) {
    console.error("Error fetching purchased courses:", error.message);
    return res
      .status(500)
      .json({ error: "Server error while fetching purchased courses." });
  }F

}