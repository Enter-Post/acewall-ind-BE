import mongoose from "mongoose";

const AIChatSchema = new mongoose.Schema({
    userId: String,
    question: {
        text: String,
        sender: String
    },
    answer: {
        text: String,
        sender: String
    },
    generatedFile: {
        url: String,
        filename: String,
        sender: String,
        FileType: String
    },
    file: {
        url: String,
        filename: String,
        sender: String
    },
    difficulty: String,
    fileUsed: String,
}, { timestamps: true }
);

const AIChat = mongoose.model("AIChat", AIChatSchema);

export default AIChat;