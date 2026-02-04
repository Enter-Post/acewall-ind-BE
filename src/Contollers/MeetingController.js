import Meeting from "../Models/Meeting";
import { generateJitsiToken } from "../Utiles/jwtToken";
import { NotFoundError } from "../Utiles/errors.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";


export const joinMeeting = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const user = req.user; // From your 'protect' middleware

  // 1. Find the meeting and populate course info
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) throw new NotFoundError("Meeting not found", "MEET_001");

    // 2. CHECK AUTHORIZATION
    // If user is Admin, let them in.
    // If user is the Teacher (Host), let them in as Moderator.
    // If user is a Student, we check if they belong to this course.
    
    const isTeacher = meeting.host.toString() === user._id.toString() || user.role === 'admin';
    
    // Check enrollment logic:
    // This assumes you have an 'enrolledCourses' array in your User or a separate Enrollment model
    // If you don't have that yet, for now, we'll check if the student role is valid
    if (user.role === 'student') {
        // ADD YOUR ENROLLMENT CHECK HERE:
        // const isEnrolled = await Enrollment.findOne({ student: user._id, course: meeting.course });
        // if (!isEnrolled) return res.status(403).json({ message: "Not enrolled in this course" });
    }

    // 3. Generate Jitsi Token
    const token = generateJitsiToken(user, meeting.roomName, isTeacher);

  // 4. Return the token and room details to React
  return res.json({
    success: true,
    data: {
      token,
      roomName: meeting.roomName,
      domain: "meet.your-lms-domain.com" // This will be your self-hosted Jitsi domain
    }
  });
});