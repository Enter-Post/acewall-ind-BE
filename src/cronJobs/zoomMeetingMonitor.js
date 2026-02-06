import cron from "node-cron";
import { ZoomMeeting } from "../Models/ZoomMeeting.model.js";

// Helper to get Zoom Access Token
let cachedToken = null;
let tokenExpiresAt = 0;

const getZoomAccessToken = async () => {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error("Missing Zoom credentials in .env");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    },
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Zoom Auth Failed: ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;

  return cachedToken;
};

// Helper: End Zoom Meeting
const endZoomMeeting = async (zoomMeetingId) => {
  try {
    const token = await getZoomAccessToken();
    const response = await fetch(
      `https://api.zoom.us/v2/meetings/${zoomMeetingId}/status`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "end" }),
      },
    );

    if (!response.ok && response.status !== 404) {
      const err = await response.json();

      // Check for scope error
      if (err.code === 4711) {
        console.error(
          `❌ ZOOM SCOPE ERROR: Your Zoom app is missing required scopes.`,
        );
        console.error(`   Please add these scopes in Zoom Marketplace:`);
        console.error(`   - meeting:update:status`);
        console.error(`   - meeting:update:status:admin`);
        console.error(`   Then restart your server.`);
      } else {
        console.error(`Zoom End Meeting Error:`, err);
      }
      return false;
    }
    return true;
  } catch (error) {
    console.error("Failed to end Zoom meeting:", error.message);
    return false;
  }
};

// Cron job to monitor and end meetings that have exceeded their duration
const monitorZoomMeetings = async () => {
  try {
    const now = new Date();

    // Find meetings that should have ended but are still active or scheduled
    const meetings = await ZoomMeeting.find({
      status: { $in: ["scheduled", "active"] },
    });

    for (const meeting of meetings) {
      // Calculate when the meeting should end
      const meetingEndTime = new Date(
        meeting.scheduledAt.getTime() + meeting.duration * 60 * 1000,
      );

      // If current time is past the meeting end time
      if (now > meetingEndTime) {
        console.log(
          `Meeting ${meeting.meetingId} has exceeded duration. Ending...`,
        );

        // Try to end the meeting on Zoom
        await endZoomMeeting(meeting.meetingId);

        // Update status in database
        meeting.status = "ended";
        await meeting.save();

        console.log(`Meeting ${meeting.meetingId} marked as ended.`);
      }
    }
  } catch (error) {
    console.error("Error in Zoom meeting monitor cron:", error);
  }
};

// Run every 2 minutes
export const startZoomMeetingMonitor = () => {
  cron.schedule("* * * * *", monitorZoomMeetings);
  console.log("✅ Zoom Meeting Monitor Cron Job Started (runs every 1 minute)");
};
