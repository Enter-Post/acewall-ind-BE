import Quarter from "../../Models/quarter.model.js";
import Semester from "../../Models/semester.model.js";

export const createQuarter = async (req, res) => {
  const { title, startDate, endDate, semester } = req.body;
  try {
    const newQuarter = new Quarter({
      title,
      startDate,
      endDate,
      semester,
    });
    await newQuarter.save();
    res
      .status(201)
      .json({ message: "Quarter created successfully", newQuarter });
  } catch (error) {
    console.log("error in creating quarter", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getQuarter = async (req, res) => {
  try {
    const quarters = await Quarter.find();
    res.status(200).json({ message: "Quarters found successfully", quarters });
  } catch (error) {
    console.log("error in the getting quarter", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getQuartersofSemester = async (req, res) => {
  const { semesterId } = req.params;

  try {
    const quarters = await Quarter.find({ semester: semesterId });
    res.status(200).json({ message: "Quarters found successfully", quarters });
  } catch (error) {
    console.log("error in the getting quarter", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getSemesterQuarter = async (req, res) => {
  const { semesterId } = req.params;

  await Quarter.find({ semester: semesterId })
    .then((quarters) => {
      res
        .status(200)
        .json({ message: "Quarters found successfully", quarters });
    })
    .catch((error) => {
      console.log("error in getting quarters for semester", error);
      res.status(500).json({ message: "Internal Server Error" });
    });
};

export const archivedQuarter = async (req, res) => {
  const { quarterId } = req.params;
  const { isArchived } = req.body;

  try {
    const updatedQuarter = await Quarter.findByIdAndUpdate(
      quarterId,
      { isArchived },
      { new: true }
    );

    if (!updatedQuarter) {
      return res.status(404).json({ message: "Quarter not found" });
    }

    res.status(200).json({
      message: "Quarter archived successfully",
      updatedQuarter,
    });
  } catch (error) {
    console.log("error in archiving quarter", error);
    res.status(500).json({ message: "Internal Server Error" });
  }

};

export const getDatesofQuarter = async (req, res) => {
  const { quarterId } = req.params;
  try {
    const quarter = await Quarter.findById(quarterId);

    if (!quarter) {
      return res.status(404).json({ message: "Quarter not found" });
    }

    res.status(200).json({
      message: "Dates found successfully",
      startDate: quarter.startDate,
      endDate: quarter.endDate,
    })
  } catch (error) {
    console.log(error, "error in getting dates of quarter");
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const editQuarter = async (req, res) => {
  const { quarterId } = req.params;
  const { title, startDate, endDate, semester } = req.body;

  try {
    // 1️⃣ Check if semester exists
    const semesterDoc = await Semester.findById(semester);
    if (!semesterDoc) {
      return res.status(404).json({ success: false, message: "Semester not found" });
    }

    // 2️⃣ Validate quarter dates are within semester dates
    if (new Date(startDate) < new Date(semesterDoc.startDate) ||
      new Date(endDate) > new Date(semesterDoc.endDate)) {
      return res.status(400).json({
        success: false,
        message: `Quarter dates must be between ${semesterDoc.startDate.toDateString()} and ${semesterDoc.endDate.toDateString()}`
      });
    }

    // 3️⃣ Check if another quarter with same title exists in the semester (case-insensitive)
    const existing = await Quarter.findOne({
      _id: { $ne: quarterId },
      title: { $regex: new RegExp(`^${title}$`, "i") },
      semester
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Another quarter with the same title already exists in this semester."
      });
    }

    // 4️⃣ Update the quarter
    const updatedQuarter = await Quarter.findByIdAndUpdate(
      quarterId,
      { title, startDate, endDate, semester },
      { new: true }
    );

    if (!updatedQuarter) {
      return res.status(404).json({ success: false, message: "Quarter not found" });
    }

    res.status(200).json({
      success: true,
      message: "Quarter edited successfully",
      updatedQuarter
    });

  } catch (error) {
    console.error("Error editing quarter", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
