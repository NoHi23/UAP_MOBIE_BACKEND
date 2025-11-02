const Major = require('../models/major');

const getAllMajors = async (req, res) => {
  const majors = await Major.find();
  res.json({ success: true, data: majors });
};

module.exports = { getAllMajors };