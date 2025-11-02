const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authorization');
const { chatWithAI,
  getChatHistoryList,
  getChatHistoryById, getNewChat } = require('../controllers/aiController');

router.use(verifyToken);
router.get('/chat/histories', getChatHistoryList);

router.get('/chat/history/:chatId', getChatHistoryById);
router.get('/chat/history', getNewChat);

router.post('/chat', chatWithAI);

router.post('/chat/:chatId', chatWithAI);

module.exports = router;