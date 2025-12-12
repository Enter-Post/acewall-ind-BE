import mongoose from "mongoose";

/* -------------------------
   Shared item schema
-------------------------- */
const gradebookItemSchema = new mongoose.Schema({
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    itemType: { type: String, enum: ["assessment", "discussion"], required: true },

    title: String,
    categoryId: mongoose.Schema.Types.ObjectId,
    categoryName: String,

    maxPoints: Number,
    studentPoints: Number,
}, { _id: false });

/* -------------------------
   Lesson-level (semester-based)
-------------------------- */
const lessonSchema = new mongoose.Schema({
    lessonId: mongoose.Schema.Types.ObjectId,
    lessonTitle: String,

    items: [gradebookItemSchema],

    gradePercentage: Number,
    letterGrade: String,
}, { _id: false });

/* -------------------------
   Chapter-level (semester-based)
-------------------------- */
const chapterSchema = new mongoose.Schema({
    chapterId: mongoose.Schema.Types.ObjectId,
    chapterTitle: String,

    items: [gradebookItemSchema],
    lessons: [lessonSchema],

    gradePercentage: Number,
    letterGrade: String,
}, { _id: false });

/* -------------------------
   Quarter-level
-------------------------- */
const quarterSchema = new mongoose.Schema({
    quarterId: mongoose.Schema.Types.ObjectId,
    quarterTitle: String,
    items: [gradebookItemSchema],
    gradePercentage: Number,
    letterGrade: String,
    gpa: Number,

    standardGrade: {
        points: Number,
        remarks: String,
    },
}, { _id: false });

/* -------------------------
   Semester-level
-------------------------- */
const semesterSchema = new mongoose.Schema({
    semesterId: mongoose.Schema.Types.ObjectId,
    semesterTitle: String,

    quarters: [quarterSchema],

    gradePercentage: Number,
    letterGrade: String,
}, { _id: false });

/* =============================================================
                        FINAL GRADEBOOK
   ============================================================= */

const GradebookSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "CourseSch", required: true },

    courseTitle: String,

    /* ⭐ Used ONLY for semester-based courses */
    semesters: [semesterSchema],

    /* ⭐ Used ONLY for chapter-based courses — FLAT STRUCTURE */
    courseItems: [gradebookItemSchema],
    // ← everything goes here (chapter assessments + lesson assessments)

    finalPercentage: Number,
    finalGPA: Number,
    finalLetterGrade: String,

    standardGrade: {
        points: Number,
        remarks: String,
    },

    totalAssessments: Number,

    lastUpdated: { type: Date, default: Date.now }
});

const Gradebook = mongoose.model("Gradebook", GradebookSchema);
export default Gradebook;
