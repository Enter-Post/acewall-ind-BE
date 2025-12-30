import model from "../../utils/gemini.js";
import fs from "fs";
import AIChat from "../Models/AIChat.model.js";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun } from "docx";
import ExcelJS from "exceljs";
import path from "path";

// Function to clean Markdown and unwanted characters
function cleanText(text) {
  return text
    .replace(/[*#_`~>-]/g, "") // remove markdown symbols
    .replace(/\\/g, "") // remove backslashes
    .replace(/\n{3,}/g, "\n\n") // normalize line breaks
    .trim();
}

export const askAI = async (req, res) => {
  const userId = req.user._id;

  try {
    const { question, difficulty, context } = req.body;
    const file = req.file; // <-- multer diskStorage file

    let conversationContext = "";
    let shouldUseContext = false;

    const history = await AIChat.findOne({ userId }).sort({ createdAt: -1 });

    if (context) {
      const messageContext = await AIChat.findById(context);

      if (messageContext) {
        conversationContext += `Student: ${messageContext.question}\n`;
        conversationContext += `Tutor: ${messageContext.answer}\n`;
      }
      shouldUseContext = true;
    }

    const followUpPhrases = [
      "explain more",
      "tell me more",
      "what do you mean",
      "continue",
      "go on",
      "more",
      "more details",
      "explain this",
      "explain that",
      "i don't understand",
      "elaborate",
      "clarify",
      "explain again",
      "explain better",
      "what else",
      "expand this",
      "can you explain",
      "explain it",
      "explain in simple words",
    ];

    const isGenericFollowUp = followUpPhrases.some((p) =>
      question.toLowerCase().includes(p)
    );

    if (isGenericFollowUp && history) {
      conversationContext += `Student: ${history.question}\n`;
      shouldUseContext = true;
    }

    const contextedPrompt = `
You are EduMentor, an AI tutor inside an LMS.

Previous conversation:
${conversationContext}

Now answer:
"${question}"
`;

    const normalPrompt = `
You are EduMentor, an AI tutor inside an LMS.
Answer in plain English.

Question:
"${question}"
Difficulty: ${difficulty}
`;

    const finalPromptText = shouldUseContext ? contextedPrompt : normalPrompt;

    // ------------------------------------------
    // 5. Prepare Gemini input parts
    // ------------------------------------------
    const parts = [{ text: finalPromptText }];

    if (file) {
      const filePath = file.path;

      // Read file from disk
      const fileBuffer = fs.readFileSync(filePath);
      const base64 = fileBuffer.toString("base64");

      parts.push({
        inlineData: {
          data: base64,
          mimeType: file.mimetype, // IMPORTANT
        },
      });
    }

    // ------------------------------------------
    // 6. Get Gemini response
    // ------------------------------------------
    const aiResponse = await model.generateContent({
      contents: [{ role: "user", parts }],
    });

    const answer = aiResponse.response.text();

    // ------------------------------------------
    // 7. Validate user question
    // ------------------------------------------
    const validationPrompt = `
Is this a meaningful academic question? Reply only "yes" or "no".

"${question}"
`;

    const validCheck = await model.generateContent(validationPrompt);
    const isMeaningful =
      validCheck.response.text().trim().toLowerCase() === "yes";

    let suggestedQuestions = [];

    if (isMeaningful) {
      const suggestions = await model.generateContent(`
Generate exactly 5 practice questions based on:
"${question}"
One per line, plain English, no bullets.
`);

      suggestedQuestions = suggestions.response
        .text()
        .split("\n")
        .map((q) => q.trim())
        .filter((q) => q.length > 3)
        .slice(0, 5);
    }

    // ------------------------------------------
    // 8. Save Chat
    // ------------------------------------------
    await AIChat.create({
      userId,
      question: { text: question, sender: "user" },
      answer: { text: answer, sender: "ai" },
      difficulty,
    });

    // ------------------------------------------
    // 9. Return response
    // ------------------------------------------
    res.json({
      success: true,
      question,
      answer,
      suggestedQuestions,
      fileUsed: file ? file.originalname : null,
    });
  } catch (err) {
    console.error("AI Error", err);
    res.status(500).json({ error: "AI Processing Failed" });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const userId = req.user._id;
    const chats = await AIChat.find({ userId }).limit(limit);

    res.json({ success: true, chats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "getChatHistory" });
  }
};

export const askAIupdated = async (req, res) => {
  const userId = req.user._id;

  try {
    const { question, difficulty, context } = req.body;
    const file = req.file; // <-- multer diskStorage file

    let conversationContext = "";
    let shouldUseContext = false;

    const history = await AIChat.findOne({ userId }).sort({ createdAt: -1 });

    if (context) {
      const messageContext = await AIChat.findById(context);

      if (messageContext) {
        conversationContext += `Student: ${messageContext.question}\n`;
        conversationContext += `Tutor: ${messageContext.answer}\n`;
      }
      shouldUseContext = true;
    }

    const followUpPhrases = [
      "explain more",
      "tell me more",
      "what do you mean",
      "continue",
      "go on",
      "more",
      "more details",
      "explain this",
      "explain that",
      "i don't understand",
      "elaborate",
      "clarify",
      "explain again",
      "explain better",
      "what else",
      "expand this",
      "can you explain",
      "explain it",
      "explain in simple words",
    ];

    const isGenericFollowUp = followUpPhrases.some((p) =>
      question.toLowerCase().includes(p)
    );

    if (isGenericFollowUp && history) {
      conversationContext += `Student: ${history.question}`;
      conversationContext += `Tutor: ${history.answer}`;
      shouldUseContext = true;
    }

    console.log(conversationContext, "conversationContext");

    const fileGenerationPrompt = `
Analyze this user message and determine if they are asking to generate a file (PDF, Word, or Excel).
Reply with ONLY one word: "pdf", "word", "excel", or "none"

User message: "${question}"
`;

    const fileTypeCheck = await model.generateContent(fileGenerationPrompt);
    const requestedFileType = fileTypeCheck.response
      .text()
      .trim()
      .toLowerCase();

    // ------------------------------------------
    // 5. Build prompt (adjust based on file generation)
    // ------------------------------------------
    let contextedPrompt = `
You are EduMentor, an AI tutor inside an LMS.

Previous conversation:
${conversationContext}

Now answer:
"${question}"
`;

    let normalPrompt = `
You are EduMentor, an AI tutor inside an LMS.
Answer in plain English.

Question:
"${question}"
Difficulty: ${difficulty}
`;

    // If user wants a file generated, modify the prompt
    if (requestedFileType !== "none") {
      const fileInstruction = `
IMPORTANT: The user has requested a ${requestedFileType.toUpperCase()} file. 
You will automatically generate and provide the file for them.
Provide ONLY a brief 2-3 sentence summary of the content.
DO NOT provide the full detailed content in your response.
DO NOT mention that you cannot create files.
DO NOT provide copy-paste instructions.
The full detailed content will be in the generated file.
`;

      contextedPrompt = `
You are EduMentor, an AI tutor inside an LMS.

Previous conversation:
${conversationContext}

${fileInstruction}

Now answer:
"${question}"
`;

      normalPrompt = `
You are EduMentor, an AI tutor inside an LMS.

${fileInstruction}

Question:
"${question}"
Difficulty: ${difficulty}
`;
    }

    const finalPromptText = shouldUseContext ? contextedPrompt : normalPrompt;

    // ------------------------------------------
    // 6. Prepare Gemini input parts
    // ------------------------------------------
    const parts = [{ text: finalPromptText }];

    if (file) {
      const filePath = file.path;

      // Read file from disk
      const fileBuffer = fs.readFileSync(filePath);
      const base64 = fileBuffer.toString("base64");

      parts.push({
        inlineData: {
          data: base64,
          mimeType: file.mimetype, // IMPORTANT
        },
      });
    }

    // ------------------------------------------
    // 7. Get Gemini response
    // ------------------------------------------
    const aiResponse = await model.generateContent({
      contents: [{ role: "user", parts }],
    });

    let answer = aiResponse.response.text();

    // If file generation is requested, we need full content for the file
    let fileContent = answer;

    if (requestedFileType !== "none") {
      // Get detailed content for the file
      const detailedPrompt = `
You are EduMentor, an AI tutor. Provide comprehensive, detailed educational content about:
"${question}"

Include:
- Clear explanations
- Examples
- Key concepts
- Important details
- Well-structured sections

Format it professionally for a ${requestedFileType.toUpperCase()} document.
`;

      const detailedResponse = await model.generateContent(detailedPrompt);
      fileContent = detailedResponse.response.text();
    }

    // ------------------------------------------
    // 8. Validate user question
    // ------------------------------------------
    const validationPrompt = `
Is this a meaningful academic question? Reply only "yes" or "no".

"${question}"
`;

    const validCheck = await model.generateContent(validationPrompt);
    const isMeaningful =
      validCheck.response.text().trim().toLowerCase() === "yes";

    let suggestedQuestions = [];

    if (isMeaningful) {
      const suggestions = await model.generateContent(`
Generate exactly 5 practice questions based on:
"${question}"
One per line, plain English, no bullets.
`);

      suggestedQuestions = suggestions.response
        .text()
        .split("\n")
        .map((q) => q.trim())
        .filter((q) => q.length > 3)
        .slice(0, 5);
    }

    // ------------------------------------------
    // 9. NEW: Generate file if requested
    // ------------------------------------------
    let generatedFileUrl = null;
    let generatedFileName = null;

    if (requestedFileType !== "none") {
      const uploadDir = path.join(process.cwd(), "uploads", "file");

      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const timestamp = Date.now();
      const randomSuffix = Math.round(Math.random() * 1e9);
      let fileExtension = "";

      if (requestedFileType === "pdf") {
        fileExtension = ".pdf";
      } else if (requestedFileType === "word") {
        fileExtension = ".docx";
      } else if (requestedFileType === "excel") {
        fileExtension = ".xlsx";
      }

      generatedFileName = `generated-${timestamp}-${randomSuffix}${fileExtension}`;
      const generatedFilePath = path.join(uploadDir, generatedFileName);

      try {
        if (requestedFileType === "pdf") {
          await generatePDF(fileContent, generatedFilePath);
        } else if (requestedFileType === "word") {
          await generateWord(fileContent, generatedFilePath);
        } else if (requestedFileType === "excel") {
          await generateExcel(fileContent, generatedFilePath);
        }

        // Generate URL based on environment
        const baseURL =
          process.env.NODE_ENV === "production"
            ? "https://api.acewallscholarslearningonline.com"
            : `http://localhost:${process.env.PORT || 5050}`;

        generatedFileUrl = `${baseURL}/uploads/file/${generatedFileName}`;
      } catch (fileGenError) {
        console.error("File generation error:", fileGenError);
        // Continue with normal response if file generation fails
      }
    }

    // ------------------------------------------
    // 10. Save Chat with file info
    // ------------------------------------------
    const chatData = {
      userId,
      question: { text: question, sender: "user" },
      answer: { text: answer, sender: "ai" },
      difficulty,
      file: {
        url: file ? file.path : null,
        filename: file ? file.originalname : null,
        sender: "user",
      },
      fileUsed: file ? file.originalname : null,
    };

    // Add generated file info if exists
    if (generatedFileUrl) {
      chatData.generatedFile = {
        url: generatedFileUrl,
        filename: generatedFileName,
        sender: "ai",
        FileType: requestedFileType,
      };
    }

    console.log(chatData, "chatData");

    await AIChat.create(chatData);

    res.json({
      success: true,
      question,
      answer,
      suggestedQuestions,
      fileUsed: file ? file.originalname : null,
      generatedFile: generatedFileUrl
        ? {
            url: generatedFileUrl,
            filename: generatedFileName,
            sender: "ai",
            FileType: requestedFileType,
          }
        : null,
    });
  } catch (err) {
    console.error("AI Error", err);
    res.status(500).json({ error: "AI Processing Failed" });
  }
};

async function generatePDF(content, filePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    // Add title
    doc.fontSize(18).font("Helvetica-Bold").text("EduMentor AI Response", {
      align: "center",
    });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Add content
    doc.fontSize(12).font("Helvetica").text(content, {
      align: "left",
      lineGap: 5,
    });

    // Add footer
    doc.moveDown(2);
    doc
      .fontSize(10)
      .fillColor("gray")
      .text(`Generated on ${new Date().toLocaleString()}`, { align: "center" });

    doc.end();

    writeStream.on("finish", () => resolve(filePath));
    writeStream.on("error", reject);
  });
}

async function generateWord(content, filePath) {
  // Parse content into paragraphs
  const paragraphs = content
    .split("\n")
    .filter((p) => p.trim())
    .map(
      (p) =>
        new Paragraph({
          children: [new TextRun(p)],
          spacing: { after: 200 },
        })
    );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "EduMentor AI Response",
                bold: true,
                size: 32,
              }),
            ],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated on ${new Date().toLocaleString()}`,
                italics: true,
                size: 20,
                color: "666666",
              }),
            ],
            spacing: { after: 400 },
          }),
          ...paragraphs,
          new Paragraph({
            children: [
              new TextRun({
                text: "___",
                size: 20,
              }),
            ],
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Powered by EduMentor AI",
                italics: true,
                size: 20,
                color: "999999",
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

async function generateExcel(content, filePath) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("AI Response");

  // Add header
  worksheet.addRow(["EduMentor AI Response"]);
  worksheet.getRow(1).font = { bold: true, size: 16 };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  worksheet.getRow(1).font = {
    bold: true,
    size: 16,
    color: { argb: "FFFFFFFF" },
  };

  // Add timestamp
  worksheet.addRow([`Generated on: ${new Date().toLocaleString()}`]);
  worksheet.getRow(2).font = { italic: true, size: 10 };

  // Add empty row
  worksheet.addRow([]);

  // Split content into rows
  const lines = content.split("\n").filter((l) => l.trim());

  lines.forEach((line) => {
    worksheet.addRow([line]);
  });

  // Auto-fit columns
  worksheet.columns = [{ width: 100 }];

  // Add borders
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 2) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    }
  });

  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

export const generateContentForTeacher = async (req, res) => {
  try {
    const { command, usedfor, difficulty } = req.body;

    const prompt = `
You are EduMentor AI, an expert educational content creator for a Learning Management System (LMS).

TASK:
Generate content strictly for the following purpose:
"${usedfor}"

INSTRUCTIONS (VERY IMPORTANT):
- Generate ONLY the final usable content.
- Do NOT include explanations, introductions, labels, or meta text.
- Do NOT mention that you are an AI.
- Do NOT include markdown unless explicitly required by the content type.
- Content must be clear, concise, and ready to be saved directly in the LMS database.

CONTENT RULES BY TYPE:
- If usedfor = "course_title":
  • Output a single clear, engaging course title (max 12 words)

- If usedfor = "courseDescription":
  • Output 1–2 short paragraphs
  • Written for students
  • No bullet points

- If usedfor = "teachingPoints":
  • Output 1–12 concise bullet points
  • Each point should be actionable and instructional

- If usedfor = "chapterTitle":
  • Output a single clear, engaging chapter title (max 12 words)

- If usedfor = "chapterDescription":
  • Output 1–2 short paragraphs
  • Written for students
  • No bullet points 
  
- If usedfor = "lessonTitle":
  • Output a single clear, engaging lesson title (max 12 words)

- If usedfor = "lessonDescription":
  • Output 1–2 short paragraphs
  • Written for students
  • No bullet points   

- If usedfor = "assessmentTitle":
  • Output a single clear, engaging chapter title (max 12 words)

- If usedfor = "assessmentDescription":
  • Output 1–2 short paragraphs
  • Written for students
  • No bullet points 

- If usedfor = "question-mcq":
  • Output 1 short questions according to the difficulty of ${difficulty} with 4 options labeled as A, B, C, D.
  • provide the full correct answer in another line as Answer: [correct answer] without the labels (A, B, C, D).
  • Written for students
  • No bullet points

- If usedfor = "question-truefalse":
  • Output 1 short questions to the difficulty of ${difficulty} with 2 options each
  • Indicate the correct answer in another line with headings "True" or "False"
  • Written for students
  • No bullet points

- If usedfor = "question-qa":
  • Output 1 short questions to the difficulty of ${difficulty}.
  • Written for students
  • No bullet points  


INPUT COMMAND:
"${command}"

Generate content now.
`;

    const aiResponse = await model.generateContent(prompt);

    res.json({
      success: true,
      usedfor,
      content: aiResponse.response.text().trim(),
    });
  } catch (error) {
    console.error("error in generateContentForTeacher", error);
    res.status(500).json({ message: "Failed to generate content for teacher" });
  }
};
