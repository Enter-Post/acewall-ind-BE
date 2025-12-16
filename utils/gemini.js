import { GoogleGenerativeAI } from "@google/generative-ai";

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Load model
const geminiModel = client.getGenerativeModel({
    model: "gemini-2.5-flash",
});

// const models = await client.listModels();
// console.log(models);

const model = {
    generateContent: async (prompt) => {
        const response = await geminiModel.generateContent(prompt);

        // Extract text safely
        return {
            response: {
                text: () => response.response.text() || ""
            }
        };
    },
};

export default model;