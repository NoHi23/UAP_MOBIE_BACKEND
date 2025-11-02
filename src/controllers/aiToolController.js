const AiTool = require('../models/aiToolModel');

const getAllTools = async (req, res) => {
  try {
    const tools = await AiTool.find().sort({ role: 1, toolName: 1 });
    res.status(200).json({ success: true, data: tools });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const createTool = async (req, res) => {
  try {
    const { toolName, description, role, parameters } = req.body;
    if (!toolName || !description || !role) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đủ thông tin (toolName, description, role).' });
    }

    const newTool = await AiTool.create({
      toolName,
      description,
      role,
      parameters: parameters || null
    });

    res.status(201).json({ success: true, data: newTool });

  } catch (error) {
    console.error("Lỗi khi tạo tool:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Tên công cụ (toolName) đã tồn tại.' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ.', error: error.message });
    }
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
const updateTool = async (req, res) => {
    try {
        const { id } = req.params;
        const { description, role, isEnabled, parameters } = req.body;
        
        const updatedTool = await AiTool.findByIdAndUpdate(
            id, 
            { description, role, isEnabled, parameters }, 
            { new: true, runValidators: true } 
        );
        
        if (!updatedTool) {
            return res.status(404).json({ message: 'Không tìm thấy công cụ.' });
        }
        res.status(200).json({ success: true, data: updatedTool });
    } catch (error) {
        console.error("Lỗi khi cập nhật tool:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Dữ liệu cập nhật không hợp lệ.', error: error.message });
        }
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const deleteTool = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTool = await AiTool.findByIdAndDelete(id);
    if (!deletedTool) {
      return res.status(404).json({ message: 'Không tìm thấy công cụ.' });
    }
    res.status(200).json({ success: true, message: 'Xóa công cụ thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = {
  getAllTools,
  createTool,
  updateTool,
  deleteTool
};