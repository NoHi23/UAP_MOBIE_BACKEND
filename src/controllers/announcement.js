
let Announcement;
try {
  Announcement = require('../models/announcement'); 
} catch (e) {
  Announcement = require('../models/annoucement'); // tên trong repo hiện tại
}

exports.createAnnouncement = async (req, res) => {
  try {
    const payload = {
      title: req.body.title,
      content: req.body.content,
      audience: req.body.audience || 'all', // all | student | lecturer | staff
      major: req.body.major || null,        // optional filter theo chuyên ngành
      classId: req.body.classId || null,    // optional filter theo lớp
      attachments: req.body.attachments || [],
      scheduledAt: req.body.scheduledAt || null,
      createdBy: req.user?._id,
    };
    const doc = await Announcement.create(payload);
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ message: 'Create announcement failed', error: err.message });
  }
};

exports.listAnnouncements = async (req, res) => {
  try {
    const { q = '', audience = '', major = '', classId = '', page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const where = {};
    if (q) where.$or = [{ title: { $regex: q, $options: 'i' } }, { content: { $regex: q, $options: 'i' } }];
    if (audience) where.audience = audience;
    if (major) where.major = major;
    if (classId) where.classId = classId;

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Announcement.find(where).sort(sort).skip(skip).limit(Number(limit)),
      Announcement.countDocuments(where),
    ]);

    res.json({
      data: items,
      meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    res.status(500).json({ message: 'List announcements failed', error: err.message });
  }
};

exports.getAnnouncement = async (req, res) => {
  try {
    const doc = await Announcement.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Announcement not found' });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: 'Get announcement failed', error: err.message });
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    const update = {
      title: req.body.title,
      content: req.body.content,
      audience: req.body.audience,
      major: req.body.major,
      classId: req.body.classId,
      attachments: req.body.attachments,
      scheduledAt: req.body.scheduledAt,
    };
    const doc = await Announcement.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!doc) return res.status(404).json({ message: 'Announcement not found' });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: 'Update announcement failed', error: err.message });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const doc = await Announcement.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Announcement not found' });
    res.json({ message: 'Deleted', id: doc._id });
  } catch (err) {
    res.status(400).json({ message: 'Delete announcement failed', error: err.message });
  }
};
