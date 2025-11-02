const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const ChatHistory = require('../models/chatHistoryModel');
const { executeTool } = require('../services/aiToolService');
const dayjs = require('dayjs');
const AiTool = require('../models/aiToolModel');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const getGenerativeModel = async (userRole) => {
    const allowedTools = await AiTool.find({ role: userRole, isEnabled: true }).lean();
    const today = dayjs().format('DD/MM/YYYY');

    const geminiTools = allowedTools.map(tool => {
        let description = tool.description;

        let toolParameters = { type: "OBJECT", properties: {}, required: [] };
        if (tool.parameters && tool.parameters.properties) {
            toolParameters.properties = tool.parameters.properties;
            toolParameters.required = tool.parameters.required || [];
        }
        return {
            functionDeclarations: [{
                name: tool.toolName,
                description: description,
                parameters: toolParameters
            }]
        };
    });

    return genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        tools: geminiTools,
        systemInstruction: `Bạn là một trợ lý AI hiệu quả. Bối cảnh: Hôm nay là ngày ${today}.
        QUY TẮC QUAN TRỌNG: Nhiệm vụ chính của bạn là gọi các công cụ (tools) được cung cấp.
        Khi người dùng hỏi một câu có thể được trả lời bằng công cụ (ví dụ: hỏi lịch, hỏi điểm), 
        bạn PHẢI tự động gọi công cụ đó ngay lập tức với các tham số đã được trích xuất.
        KHÔNG ĐƯỢC HỎI LẠI ĐỂ XÁC NHẬN. Hãy tự tin hành động.`,
        safetySettings: safetySettings
    });
};

const chatWithAI = async (req, res) => {
    try {
        const { message } = req.body;
        const { chatId } = req.params;
        const accountId = req.user.id;
        const userRole = req.user.role;

        let chatHistory;

        if (chatId) {
            chatHistory = await ChatHistory.findOne({ _id: chatId, accountId });
            if (!chatHistory) return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện." });
        } else {
            chatHistory = new ChatHistory({ accountId, messages: [] });
        }

        const model = await getGenerativeModel(userRole);
        const chat = model.startChat({
            history: chatHistory.messages.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.content }]
            })),
        });

        const result = await chat.sendMessage(message);
        const response = result.response;

        chatHistory.messages.push({ role: 'user', content: message });

        if (response.functionCalls && response.functionCalls.length > 0) {
            const functionCalls = response.functionCalls;
            const call = functionCalls[0];

            console.log(`[DEBUG] AI yêu cầu gọi hàm: ${call.name}`);
            console.log(`[DEBUG] Với tham số: ${JSON.stringify(call.args)}`);

            const toolResult = await executeTool(call.name, call.args, accountId);

            console.log(`[DEBUG] Kết quả từ tool: ${JSON.stringify(toolResult)}`);

            const result2 = await chat.sendMessage([{ functionResponse: { name: call.name, response: toolResult } }]);

            if (!result2.response || !result2.response.text()) {
                throw new Error("AI không phản hồi sau khi nhận kết quả tool (có thể do safety filter).");
            }

            const finalResponse = result2.response.text();

            chatHistory.messages.push({ role: 'model', content: finalResponse });
            await chatHistory.save();
            return res.status(200).json({ reply: finalResponse, chatId: chatHistory._id });
        } else if (response.text()) {
            const replyText = response.text();
            chatHistory.messages.push({ role: 'model', content: replyText });
            await chatHistory.save();
            return res.status(200).json({ reply: replyText, chatId: chatHistory._id });
        }

        throw new Error("AI không phản hồi. (Có thể do Safety Filter)");
    } catch (error) {
        console.error("Lỗi AI Chat:", error);
        res.status(500).json({ message: 'Lỗi server khi giao tiếp với AI.' });
    }
};

const getChatHistoryList = async (req, res) => {
    try {
        const accountId = req.user.id;
        const histories = await ChatHistory.find({ accountId })
            .select('messages createdAt updatedAt')
            .sort({ updatedAt: -1 })
            .limit(20);

        const historyList = histories.map(h => ({
            _id: h._id,
            title: h.messages[0] ? h.messages[0].content.substring(0, 40) + '...' : 'Cuộc trò chuyện mới',
            updatedAt: h.updatedAt
        }));

        res.status(200).json({ success: true, data: historyList });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getChatHistoryById = async (req, res) => {
    try {
        const { chatId } = req.params;
        const accountId = req.user.id;

        const chatHistory = await ChatHistory.findOne({ _id: chatId, accountId });
        if (!chatHistory) {
            return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện." });
        }
        res.status(200).json({ success: true, data: chatHistory.messages });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getNewChat = async (req, res) => {
    try {
        const initialMessage = {
            role: 'model',
            content: 'Chào bạn, tôi là trợ lý AI của UAP. Bạn cần giúp gì?'
        };
        res.status(200).json({ success: true, data: [initialMessage] });
    } catch (error) {
        console.error("Lỗi khi tạo chat mới:", error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};
module.exports = {
    chatWithAI,
    getChatHistoryList,
    getChatHistoryById,
    getNewChat
};