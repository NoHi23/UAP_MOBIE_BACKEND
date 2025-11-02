const Subject = require('../models/subject');
const Major = require('../models/major');
const Material = require('../models/material');
const CLO = require('../models/courseLearningOutcome');
const SessionMaterial = require('../models/sessionMaterial');
// Bulk create materials handler moved here so material-related staff features live together

// POST /api/staff/subjects
// Create a new Subject from staff material manager UI
const createSubject = async (req, res) => {
  try {
    const payload = req.body || {};
    const {
      subjectCode,
      subjectName,
      subjectEnglish,
      subjectNoCredit,
      degreeLevel,
      timeAllocation,
      preRequisite,
      description,
      studentTask,
      tools,
      scoringScale,
      decisionNumber,
      minAvgMarkToPass,
      status,
      approveDate,
      majorId
    } = payload;

    // Basic validation
    if (!subjectCode || !String(subjectCode).trim()) return res.status(400).json({ success: false, message: 'subjectCode is required' });
    if (!subjectName || !String(subjectName).trim()) return res.status(400).json({ success: false, message: 'subjectName is required' });
    if (subjectNoCredit === undefined || subjectNoCredit === null) return res.status(400).json({ success: false, message: 'subjectNoCredit is required' });
    if (!majorId) return res.status(400).json({ success: false, message: 'majorId is required (select a Major)'});

    // verify major exists
    const major = await Major.findById(majorId);
    if (!major) return res.status(400).json({ success: false, message: `Major with id ${majorId} not found` });

    // handle preRequisite: allow array of subjectCodes or array of ids; normalize to ObjectId refs
    let prereqIds = [];
    if (preRequisite) {
      // if string comma-separated
      let arr = preRequisite;
      if (typeof preRequisite === 'string') {
        arr = preRequisite.split(',').map(s=>s.trim()).filter(Boolean);
      }
      if (Array.isArray(arr) && arr.length) {
        // if values look like ObjectId length, try treat as ids, else treat as codes
        const codes = arr.filter(a => String(a).length < 30);
        const ids = arr.filter(a => String(a).length >= 30);

        // resolve codes to subject ids
        if (codes.length) {
          const found = await Subject.find({ subjectCode: { $in: codes } }).select('_id subjectCode');
          const foundCodes = found.map(f => f.subjectCode);
          const missing = codes.filter(c => !foundCodes.includes(c));
          if (missing.length) return res.status(400).json({ success: false, message: `PreRequisite subjectCodes not found: ${missing.join(',')}` });
          prereqIds = prereqIds.concat(found.map(f => f._id));
        }

        // include ids as-is
        if (ids.length) prereqIds = prereqIds.concat(ids);
      }
    }

    // Ensure subjectCode unique
    const exist = await Subject.findOne({ subjectCode: String(subjectCode).trim() });
    if (exist) return res.status(400).json({ success: false, message: `Subject with code ${subjectCode} already exists` });

    const doc = new Subject({
      subjectCode: String(subjectCode).trim(),
      subjectName: String(subjectName).trim(),
      subjectEnglish: subjectEnglish || '',
      subjectNoCredit: Number(subjectNoCredit),
      degreeLevel: degreeLevel || '',
      timeAllocation: timeAllocation || '',
      preRequisite: prereqIds,
      description: description || '',
      studentTask: studentTask || '',
      tools: tools || '',
      scoringScale: scoringScale || undefined,
      decisionNumber: decisionNumber || '',
      minAvgMarkToPass: (minAvgMarkToPass !== undefined && minAvgMarkToPass !== null) ? Number(minAvgMarkToPass) : undefined,
      status: status === undefined ? true : Boolean(status),
      approveDate: approveDate ? new Date(approveDate) : undefined,
      majorId
    });

    await doc.save();

    return res.status(201).json({ success: true, message: 'Subject created', data: doc });
  } catch (err) {
    console.error('createSubject error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createSubject };
 
// PUT /api/staff/subjects/:id
// Update an existing subject
const updateSubject = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const {
      subjectCode,
      subjectName,
      subjectEnglish,
      subjectNoCredit,
      degreeLevel,
      timeAllocation,
      preRequisite,
      description,
      studentTask,
      tools,
      scoringScale,
      decisionNumber,
      minAvgMarkToPass,
      status,
      approveDate,
      majorId
    } = payload;

    const subject = await Subject.findById(id);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });

    // Basic validation if provided
    if (subjectCode && !String(subjectCode).trim()) return res.status(400).json({ success: false, message: 'subjectCode is invalid' });
    if (subjectName && !String(subjectName).trim()) return res.status(400).json({ success: false, message: 'subjectName is invalid' });

    if (majorId) {
      const major = await Major.findById(majorId);
      if (!major) return res.status(400).json({ success: false, message: `Major with id ${majorId} not found` });
    }

    // handle preRequisite similar to create: normalize to ObjectId refs
    let prereqIds = [];
    if (preRequisite !== undefined) {
      let arr = preRequisite;
      if (typeof preRequisite === 'string') {
        arr = preRequisite.split(',').map(s=>s.trim()).filter(Boolean);
      }
      if (Array.isArray(arr) && arr.length) {
        const codes = arr.filter(a => String(a).length < 30);
        const ids = arr.filter(a => String(a).length >= 30);
        if (codes.length) {
          const found = await Subject.find({ subjectCode: { $in: codes } }).select('_id subjectCode');
          const foundCodes = found.map(f => f.subjectCode);
          const missing = codes.filter(c => !foundCodes.includes(c));
          if (missing.length) return res.status(400).json({ success: false, message: `PreRequisite subjectCodes not found: ${missing.join(',')}` });
          prereqIds = prereqIds.concat(found.map(f => f._id));
        }
        if (ids.length) prereqIds = prereqIds.concat(ids);
      }
    }

    // ensure subjectCode uniqueness when changed
    if (subjectCode && String(subjectCode).trim() !== subject.subjectCode) {
      const exist = await Subject.findOne({ subjectCode: String(subjectCode).trim() });
      if (exist) return res.status(400).json({ success: false, message: `Subject with code ${subjectCode} already exists` });
    }

    // apply updates
    if (subjectCode !== undefined) subject.subjectCode = String(subjectCode).trim();
    if (subjectName !== undefined) subject.subjectName = String(subjectName).trim();
    if (subjectEnglish !== undefined) subject.subjectEnglish = subjectEnglish || '';
    if (subjectNoCredit !== undefined) subject.subjectNoCredit = Number(subjectNoCredit);
    if (degreeLevel !== undefined) subject.degreeLevel = degreeLevel || '';
    if (timeAllocation !== undefined) subject.timeAllocation = timeAllocation || '';
    if (preRequisite !== undefined) subject.preRequisite = prereqIds;
    if (description !== undefined) subject.description = description || '';
    if (studentTask !== undefined) subject.studentTask = studentTask || '';
    if (tools !== undefined) subject.tools = tools || '';
    if (scoringScale !== undefined) subject.scoringScale = scoringScale || undefined;
    if (decisionNumber !== undefined) subject.decisionNumber = decisionNumber || '';
    if (minAvgMarkToPass !== undefined) subject.minAvgMarkToPass = (minAvgMarkToPass !== null ? Number(minAvgMarkToPass) : undefined);
    if (status !== undefined) subject.status = Boolean(status);
    if (approveDate !== undefined) subject.approveDate = approveDate ? new Date(approveDate) : undefined;
    if (majorId !== undefined) subject.majorId = majorId;

    await subject.save();

    return res.status(200).json({ success: true, message: 'Subject updated', data: subject });
  } catch (err) {
    console.error('updateSubject error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createSubject, updateSubject };

// GET /api/staff/subjects
const getSubjects = async (req, res) => {
  try {
    // Allow optional query to filter by majorId
    const query = {};
    if (req.query.majorId) query.majorId = req.query.majorId;

    const subjects = await Subject.find(query)
      .select('subjectCode subjectName subjectEnglish subjectNoCredit degreeLevel timeAllocation preRequisite description tools scoringScale decisionNumber minAvgMarkToPass approveDate majorId')
      .populate('majorId', 'majorName majorCode')
      .populate({ path: 'preRequisite', select: 'subjectCode subjectName' });

    return res.status(200).json({ success: true, count: subjects.length, data: subjects });
  } catch (err) {
    console.error('getSubjects error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/staff/subjects/:id
const getSubjectById = async (req, res) => {
  try {
    const id = req.params.id;
    const subject = await Subject.findById(id)
      .select('subjectCode subjectName subjectEnglish subjectNoCredit degreeLevel timeAllocation preRequisite description tools scoringScale decisionNumber minAvgMarkToPass approveDate majorId studentTask')
      .populate('majorId', 'majorName majorCode')
      .populate({ path: 'preRequisite', select: 'subjectCode subjectName' });

    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });

    return res.status(200).json({ success: true, data: subject });
  } catch (err) {
    console.error('getSubjectById error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Bulk create materials
// Accepts array of material objects in request body. Returns insertedCount and per-row errors.
// Query params supported: dedupe=true|false, replace=true|false
const bulkCreateMaterials = async (req, res) => {
  try {
    const rows = req.body;

    if (!Array.isArray(rows)) {
      return res.status(400).json({ success: false, message: 'Payload must be an array of material objects' });
    }
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Empty array provided' });
    }
    const MAX_ROWS = 2000;
    if (rows.length > MAX_ROWS) {
      return res.status(400).json({ success: false, message: `Too many rows. Max allowed is ${MAX_ROWS}` });
    }

    const subjectIds = Array.from(new Set(rows.map(r => r && r.subjectId).filter(Boolean)));
    const validSubjects = {};
    if (subjectIds.length > 0) {
      const subjects = await Subject.find({ _id: { $in: subjectIds } }).select('_id');
      subjects.forEach(s => { validSubjects[s._id.toString()] = true; });
    }

    const docs = [];
    const errors = [];

    rows.forEach((row, idx) => {
      const rowErrors = [];
      if (!row || typeof row !== 'object') {
        rowErrors.push('Row must be an object');
      } else {
        if (!row.subjectId) rowErrors.push('subjectId is required');
        else if (!validSubjects[row.subjectId]) rowErrors.push('subjectId not found');

        if (!row.materialDescription && !row.url) rowErrors.push('materialDescription or url is required');
      }

      if (rowErrors.length) {
        errors.push({ index: idx, errors: rowErrors, row });
      } else {
        const doc = Object.assign({}, row);
        doc.isMainMaterial = !!doc.isMainMaterial;
        doc.isOnline = !!doc.isOnline;
        // Normalize isbn: if empty string or only whitespace, remove the field so sparse unique index won't conflict
        if (Object.prototype.hasOwnProperty.call(doc, 'isbn')) {
          if (doc.isbn === null) delete doc.isbn;
          else {
            const isbnTrim = String(doc.isbn || '').trim();
            if (isbnTrim === '') delete doc.isbn;
            else doc.isbn = isbnTrim;
          }
        }
        // Leave author as-is (now optional in schema); don't inject placeholder 'Imported'
        docs.push(doc);
      }
    });

  let insertedCount = 0;
  let modifiedCount = 0;
  let skippedCount = 0;
  // dedupe flag: if true, perform upsert (avoid duplicates); otherwise insert all rows (allow duplicates)
  const dedupe = (req.query && String(req.query.dedupe) === 'true');
  // replace flag: if true, delete existing materials for the subject(s) before inserting
  const replace = (req.query && String(req.query.replace) === 'true');

    if (docs.length > 0) {
      // If replace requested, delete existing materials for the subject(s)
      if (replace && subjectIds.length > 0) {
        await Material.deleteMany({ subjectId: { $in: subjectIds } });
      }
      if (dedupe) {
        // Build bulk ops: upsert by (subjectId + url) if url present, otherwise by (subjectId + materialDescription)
        const ops = docs.map(doc => {
          const filter = { subjectId: doc.subjectId };
          if (doc.url && String(doc.url).trim()) {
            filter.url = doc.url;
          } else if (doc.materialDescription && String(doc.materialDescription).trim()) {
            filter.materialDescription = doc.materialDescription;
          }
          const toSet = Object.assign({}, doc);
          delete toSet._id;
          return {
            updateOne: {
              filter,
              update: { $set: toSet },
              upsert: true
            }
          };
        });

        const bulkResult = await Material.bulkWrite(ops, { ordered: false });
        insertedCount = bulkResult.upsertedCount || 0;
        modifiedCount = bulkResult.modifiedCount || 0;
      } else {
        // Allow duplicates: insert all docs
        const insertedDocs = await Material.insertMany(docs, { ordered: false });
        insertedCount = Array.isArray(insertedDocs) ? insertedDocs.length : 0;
        modifiedCount = 0;
      }
    }

      // Provide more diagnostic info if nothing changed so frontend can show details
  const statusCode = (errors.length === 0 && (insertedCount > 0 || modifiedCount > 0)) ? 201 : 200;
  return res.status(statusCode).json({ success: true, receivedCount: rows.length, validCount: docs.length, insertedCount, modifiedCount, skippedCount, dedupe, errors });
  } catch (error) {
    console.error('bulkCreateMaterials error:', error);
    if (error && error.writeErrors) {
      const details = error.writeErrors.map(e => ({ index: e.index, errmsg: e.errmsg }));
      return res.status(200).json({ success: false, message: 'Partial failure during insertMany', details });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

  // Bulk create CLOs
  // Accepts array of CLO objects: { cloDetails, loDetails?, subjectId }
  const bulkCreateCLOs = async (req, res) => {
    try {
      const rows = req.body;
      if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ success: false, message: 'Payload must be a non-empty array' });
      const MAX_ROWS = 2000;
      if (rows.length > MAX_ROWS) return res.status(400).json({ success: false, message: `Too many rows. Max allowed is ${MAX_ROWS}` });
      // Preserve original count for reporting (we may expand rows with multiple cloDetails)
      const originalReceivedCount = rows.length;

      // Expand rows if a single input row contains multiple cloDetails separated by comma/semicolon
      const processedRows = [];
      rows.forEach((r, origIdx) => {
        if (r && r.cloDetails && String(r.cloDetails).trim() !== '') {
          // split on common separators
          const parts = String(r.cloDetails).split(/[;,]+/).map(s => s.trim()).filter(Boolean);
          if (parts.length > 1) {
            parts.forEach(p => {
              const clone = Object.assign({}, r);
              clone.cloDetails = p;
              clone.__origIndex = origIdx;
              processedRows.push(clone);
            });
            return;
          }
        }
        const clone = Object.assign({}, r);
        clone.__origIndex = origIdx;
        processedRows.push(clone);
      });

      const subjectIds = Array.from(new Set(processedRows.map(r => r && r.subjectId).filter(Boolean)));
      const validSubjects = {};
      if (subjectIds.length > 0) {
        const subjects = await Subject.find({ _id: { $in: subjectIds } }).select('_id');
        subjects.forEach(s => { validSubjects[s._id.toString()] = true; });
      }

      const docs = [];
      const errors = [];
      rows.forEach((row, idx) => {
        const rowErrors = [];
        if (!row || typeof row !== 'object') rowErrors.push('Row must be an object');
        else {
          if (!row.subjectId) rowErrors.push('subjectId is required');
          else if (!validSubjects[row.subjectId]) rowErrors.push('subjectId not found');
          if (!row.cloDetails) rowErrors.push('cloDetails is required');
        }
        if (rowErrors.length) errors.push({ index: idx, errors: rowErrors, row });
        else docs.push({ cloDetails: String(row.cloDetails).trim(), loDetails: row.loDetails || '', subjectId: row.subjectId });
      });

      const replace = (req.query && String(req.query.replace) === 'true');
      const dedupe = (req.query && String(req.query.dedupe) === 'true');
      let insertedCount = 0, modifiedCount = 0, skippedCount = 0;
      if (docs.length > 0) {
        if (replace && subjectIds.length > 0) {
          await CLO.deleteMany({ subjectId: { $in: subjectIds } });
        }
        if (dedupe) {
          const ops = docs.map(doc => ({
            updateOne: { filter: { subjectId: doc.subjectId, cloDetails: doc.cloDetails }, update: { $set: doc }, upsert: true }
          }));
          const r = await CLO.bulkWrite(ops, { ordered: false });
          insertedCount = r.upsertedCount || 0;
          modifiedCount = r.modifiedCount || 0;
        } else {
          // To avoid global unique-index conflicts (and the E11000 error), pre-check existing CLOs for the same subject(s)
          // and skip docs that already exist (same subjectId + cloDetails case-insensitive).
          const toInsert = [];
          const existingSet = new Set();
          if (subjectIds.length > 0) {
            try {
            // Fetch existing CLOs for these subjects and normalize to lower-case to avoid case-sensitivity misses
            const existing = await CLO.find({ subjectId: { $in: subjectIds } }).select('cloDetails subjectId');
            (existing || []).forEach(e => existingSet.add(`${String(e.subjectId)}__${String(e.cloDetails || '').trim().toLowerCase()}`));
            } catch (e) {
              // ignore and proceed — we'll attempt insert and surface any DB errors
            }
          }

          docs.forEach(d => {
            const key = `${String(d.subjectId)}__${String(d.cloDetails).trim().toLowerCase()}`;
            if (existingSet.has(key)) {
              skippedCount += 1;
            } else {
              toInsert.push(d);
            }
          });

          if (toInsert.length > 0) {
            try {
              const inserted = await CLO.insertMany(toInsert, { ordered: false });
              insertedCount = Array.isArray(inserted) ? inserted.length : 0;
            } catch (insertErr) {
              // If duplicate key still occurs (race condition or leftover global index), capture and return a helpful error
              if (insertErr && insertErr.code === 11000) {
                console.error('bulkCreateCLOs duplicate key during insertMany:', insertErr);
                return res.status(400).json({ success: false, message: 'Duplicate CLO detected during insert', detail: insertErr.message });
              }
              throw insertErr;
            }
          }
        }
      }
      const statusCode = (errors.length === 0 && (insertedCount > 0 || modifiedCount > 0)) ? 201 : 200;
      return res.status(statusCode).json({ success: true, receivedCount: rows.length, validCount: docs.length, insertedCount, modifiedCount, dedupe, errors });
    } catch (err) {
      console.error('bulkCreateCLOs error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  };

  // Bulk create SessionMaterials
  // Accepts array of session material objects: { topic, learningTeachingType?, itu?, studentMaterial?, downloadable?, studentTask?, urls?, cloId, subjectId }
  const bulkCreateSessionMaterials = async (req, res) => {
    try {
      const rows = req.body;
      if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ success: false, message: 'Payload must be a non-empty array' });
      const MAX_ROWS = 2000;
      if (rows.length > MAX_ROWS) return res.status(400).json({ success: false, message: `Too many rows. Max allowed is ${MAX_ROWS}` });
      // Preserve original count for reporting (we may expand rows with multiple cloDetails/cloIds)
      const originalReceivedCount = rows.length;

      // Helper: parse boolean-like values robustly
      const parseBool = (v) => {
        if (v === undefined || v === null || v === '') return false;
        if (typeof v === 'boolean') return v;
        if (typeof v === 'number') return v !== 0;
        const s = String(v).trim().toLowerCase();
        const truthy = ['true', 'yes', '1', 'y', 'on', 'checked'];
        if (truthy.includes(s)) return true;
        return false;
      };

      // Expand rows: support cloDetails as string (single or CSV), cloDetails as array, cloId as single or array.
      // Use `expandedRows` as the temporary container so we can later normalize into `processedRows`.
      const expandedRows = [];
      rows.forEach((origRow, origIdx) => {
        const r = Object.assign({}, origRow);
        r.__origIndex = origIdx;

        // Normalize cloId/cloDetails to arrays for expansion
        let cloIdValues = [];
        let cloDetailValues = [];

        if (Array.isArray(r.cloId) && r.cloId.length) {
          cloIdValues = r.cloId.map(String);
        } else if (r.cloId) {
          // single id string
          cloIdValues = [String(r.cloId)];
        }

        if (Array.isArray(r.cloDetails) && r.cloDetails.length) {
          cloDetailValues = r.cloDetails.map(String).map(s => s.trim()).filter(Boolean);
        } else if (r.cloDetails && String(r.cloDetails).trim() !== '') {
          // split CSV/semicolon/newline
          cloDetailValues = String(r.cloDetails).split(/[;,\n\r]+/).map(s => s.trim()).filter(Boolean);
        }

        // If cloId array provided, expand by cloId values directly (no resolution needed)
        if (cloIdValues.length > 0) {
          cloIdValues.forEach(cid => {
            const clone = Object.assign({}, r);
            clone.cloId = cid;
            clone.cloDetails = undefined;
            expandedRows.push(clone);
          });
          return;
        }

        // Otherwise if cloDetailValues present, expand by each detail (to be resolved later)
        if (cloDetailValues.length > 0) {
          cloDetailValues.forEach(cd => {
            const clone = Object.assign({}, r);
            clone.cloDetails = cd;
            clone.cloId = undefined;
            expandedRows.push(clone);
          });
          return;
        }

        // No clo info provided — keep as-is (validation will catch missing clo)
        expandedRows.push(r);
      });
        // Normalize rows: produce processedRows where each row contains a learningOutcomes array (strings)
        const processedRows = [];
        for (let origIdx = 0; origIdx < expandedRows.length; origIdx++) {
          const origRow = expandedRows[origIdx];
          const r = Object.assign({}, origRow);
          // preserve the original row index when possible (set during expansion)
          r.__origIndex = (origRow && origRow.__origIndex !== undefined) ? origRow.__origIndex : origIdx;

          // Build learningOutcomes array from several possible inputs:
          // - r.learningOutcomes (array)
          // - r.cloDetails (string CSV or array)
          // - r.cloId (id or array) -> resolve to cloDetails from CLO collection
          let loValues = [];
          if (Array.isArray(r.learningOutcomes) && r.learningOutcomes.length) {
            loValues = r.learningOutcomes.map(String).map(s => s.trim()).filter(Boolean);
          } else if (Array.isArray(r.cloDetails) && r.cloDetails.length) {
            loValues = r.cloDetails.map(String).map(s => s.trim()).filter(Boolean);
          } else if (r.cloDetails && String(r.cloDetails).trim() !== '') {
            loValues = String(r.cloDetails).split(/[;,\n\r]+/).map(s => s.trim()).filter(Boolean);
          }

          // If no learning outcomes extracted yet, but cloId(s) provided, resolve them to cloDetails
          if (loValues.length === 0 && r.cloId) {
            let ids = [];
            if (Array.isArray(r.cloId) && r.cloId.length) ids = r.cloId.map(String);
            else if (r.cloId) ids = [String(r.cloId)];
            if (ids.length) {
              try {
                const found = await CLO.find({ _id: { $in: ids } }).select('cloDetails');
                loValues = (found || []).map(f => String(f.cloDetails || '').trim()).filter(Boolean);
              } catch (e) {
                // ignore resolution errors here; validation will report missing
              }
            }
          }

          // Deduplicate and assign
          r.learningOutcomes = Array.from(new Set((loValues || []).map(String).map(s => s.trim()).filter(Boolean)));
          processedRows.push(r);
        }

      const subjectIds = Array.from(new Set(processedRows.map(r => r && r.subjectId).filter(Boolean)));

      // Collect all learning outcome strings across processedRows for existence check
      const allLOs = Array.from(new Set(processedRows.flatMap(r => Array.isArray(r.learningOutcomes) ? r.learningOutcomes : [])));
      // Query CLO collection to find which LO strings actually exist for the relevant subject(s)
      const foundClos = allLOs.length ? await CLO.find({
        cloDetails: { $in: allLOs.map(s => new RegExp(`^${s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i')) },
        ...(subjectIds.length ? { subjectId: { $in: subjectIds } } : {})
      }).select('cloDetails subjectId') : [];
      const foundSet = new Set((foundClos || []).map(c => String(c.cloDetails || '').trim().toLowerCase()));
      const validSubjects = {};
      if (subjectIds.length > 0) {
        const subjects = await Subject.find({ _id: { $in: subjectIds } }).select('_id');
        subjects.forEach(s => { validSubjects[s._id.toString()] = true; });
      }

      const docs = [];
      const errors = [];
      // Validate/process using processedRows, but report errors referencing the original row index (__origIndex)
      processedRows.forEach((row, idx) => {
        const rowErrors = [];
        if (!row || typeof row !== 'object') rowErrors.push('Row must be an object');
        else {
          if (!row.subjectId) rowErrors.push('subjectId is required');
          else if (!validSubjects[row.subjectId]) rowErrors.push('subjectId not found');
          // Validate learningOutcomes (array of strings) exist in CLO collection for the subject(s)
          if (!Array.isArray(row.learningOutcomes) || row.learningOutcomes.length === 0) {
            rowErrors.push('learningOutcomes is required');
          } else {
            const missing = row.learningOutcomes.filter(lo => !foundSet.has(String(lo || '').trim().toLowerCase()));
            if (missing.length) rowErrors.push(`learningOutcomes not found: ${missing.join(',')}`);
          }
          if (row.session === undefined || row.session === null || String(row.session).trim() === '') rowErrors.push('session is required');
          else {
            const s = Number(row.session);
            if (!Number.isFinite(s) || !Number.isInteger(s) || s < 0) rowErrors.push('session must be a non-negative integer');
          }
          if (!row.topic) rowErrors.push('topic is required');
        }
        if (rowErrors.length) errors.push({ index: row.__origIndex !== undefined ? row.__origIndex : idx, errors: rowErrors, row });
        else {
          const doc = {
            session: Number(row.session),
            topic: String(row.topic).trim(),
            learningTeachingType: row.learningTeachingType || '',
            // ITU is stored as string in schema; keep the trimmed string value if present
            itu: row.itu !== undefined && row.itu !== null && String(row.itu).trim() !== '' ? String(row.itu).trim() : undefined,
            // Store studentMaterial/downloadable as strings per schema
            studentMaterial: (row.studentMaterial === undefined || row.studentMaterial === null) ? undefined : String(row.studentMaterial).trim(),
            downloadable: (row.downloadable === undefined || row.downloadable === null) ? undefined : String(row.downloadable).trim(),
            studentTask: row.studentTask || '',
            urls: Array.isArray(row.urls) ? row.urls : (row.urls ? String(row.urls).split(/[;,\n\r]+/).map(s=>String(s).trim()).filter(Boolean) : []),
            learningOutcomes: Array.isArray(row.learningOutcomes) ? row.learningOutcomes.map(s => String(s).trim()) : [],
            subjectId: row.subjectId
          };
          docs.push(doc);
        }
      });

        // if there are validation errors, return them and do not perform any insert
        if (errors.length > 0) {
          // include session value (if available) for easier diagnosis
          const enriched = errors.map(e => ({ index: e.index, session: e.row && e.row.session !== undefined ? e.row.session : undefined, errors: e.errors, row: e.row }));
          return res.status(400).json({ success: false, message: 'Validation failed', receivedCount: originalReceivedCount, errors: enriched });
        }

        const replace = (req.query && String(req.query.replace) === 'true');
      const dedupe = (req.query && String(req.query.dedupe) === 'true');
      let insertedCount = 0, modifiedCount = 0;
      if (docs.length > 0) {
        if (replace && subjectIds.length > 0) {
          await SessionMaterial.deleteMany({ subjectId: { $in: subjectIds } });
        }
        if (dedupe) {
          // include session in dedupe filter so duplicates are detected per-session
          const ops = docs.map(doc => ({
            updateOne: { filter: { subjectId: doc.subjectId, session: doc.session, topic: doc.topic }, update: { $set: doc }, upsert: true }
          }));
          const r = await SessionMaterial.bulkWrite(ops, { ordered: false });
          insertedCount = r.upsertedCount || 0;
          modifiedCount = r.modifiedCount || 0;
        } else {
          const inserted = await SessionMaterial.insertMany(docs, { ordered: false });
          insertedCount = Array.isArray(inserted) ? inserted.length : 0;
        }
      }
      const statusCode = (errors.length === 0 && (insertedCount > 0 || modifiedCount > 0)) ? 201 : 200;
  return res.status(statusCode).json({ success: true, receivedCount: originalReceivedCount, validCount: docs.length, insertedCount, modifiedCount, dedupe, errors });
    } catch (err) {
      console.error('bulkCreateSessionMaterials error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  };

  // GET /api/staff/clos
  const getCLOs = async (req, res) => {
    try {
      const query = {};
      if (req.query.subjectId) query.subjectId = req.query.subjectId;
      const clos = await CLO.find(query).select('cloDetails loDetails subjectId');
      return res.status(200).json({ success: true, count: (clos || []).length, data: clos });
    } catch (err) {
      console.error('getCLOs error', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  };

  // GET /api/staff/clos/find?cloDetails=partialName[&subjectId=...]
  // Return CLOs whose cloDetails match the provided string (case-insensitive, partial match).
  const findCLOByDetails = async (req, res) => {
    try {
      const { cloDetails, subjectId } = req.query;
      if (!cloDetails || String(cloDetails).trim() === '') return res.status(400).json({ success: false, message: 'cloDetails query is required' });
      // escape RegExp special chars
      const esc = String(cloDetails).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(esc, 'i');
      const q = { cloDetails: { $regex: re } };
      if (subjectId) q.subjectId = subjectId;
      const clos = await CLO.find(q).select('_id cloDetails subjectId');
      return res.status(200).json({ success: true, count: (clos || []).length, data: clos });
    } catch (err) {
      console.error('findCLOByDetails error', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  };

  // GET /api/staff/session-materials
  const getSessionMaterials = async (req, res) => {
    try {
      const query = {};
      if (req.query.subjectId) query.subjectId = req.query.subjectId;
      if (req.query.cloId) query.cloId = req.query.cloId;
      // populate cloId to return cloDetails for display in frontend
      const items = await SessionMaterial.find(query)
        .select('session topic learningTeachingType itu studentMaterial downloadable studentTask urls learningOutcomes subjectId');
      return res.status(200).json({ success: true, count: (items || []).length, data: items });
    } catch (err) {
      console.error('getSessionMaterials error', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  };

  module.exports = { createSubject, updateSubject, getSubjects, getSubjectById, bulkCreateMaterials, bulkCreateCLOs, bulkCreateSessionMaterials, getCLOs, getSessionMaterials, findCLOByDetails };

