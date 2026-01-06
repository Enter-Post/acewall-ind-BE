import { GoogleGenerativeAI } from "@google/generative-ai";

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. Model for Text Generation
const geminiModel = client.getGenerativeModel({
    model: "gemini-2.5-flash",
});

// 2. Model for Image Generation (Paid Tier)
const imageModel = client.getGenerativeModel({ 
    model: "gemini-2.5-flash-image" 
});

const model = {
    // Text generation (stays thes same)
    generateContent: async (prompt) => {
        const response = await geminiModel.generateContent(prompt);
        return {
            response: {
                text: () => response.response.text() || ""
            }
        };
    },

    // Updated Image Generation logic
    generateImage: async ({ prompt, aspectRatio = "1:1" }) => {
        try {
            const result = await imageModel.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    responseModalities: ["IMAGE"],
                    // FIX: aspectRatio must be inside imageConfig
                    imageConfig: {
                        aspectRatio: aspectRatio,
                    }
                }
            });

            const response = await result.response;
            
            // Find the image part in the response
            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

            if (!imagePart) {
                throw new Error("No image data returned. The prompt might have been blocked by safety filters.");
            }

            return {
                imageBase64: imagePart.inlineData.data,
                mimeType: imagePart.inlineData.mimeType
            };
        } catch (error) {
            console.error("Gemini Image Model Error:", error);
            throw error;
        }
    }
};

export default model;