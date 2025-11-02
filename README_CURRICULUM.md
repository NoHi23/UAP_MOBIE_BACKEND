Curriculum API

Endpoints:

1) List curriculums
GET /api/curriculums
Headers: Authorization: Bearer <token>
Response: 200
[
  {
    "curriculumId": "64f1...",
    "curriculumName": "Software Engineering 2022",
    "major": "Software Engineering",
    "totalSemester": 9,
    "yearApplied": 2022,
    "description": "..."
  },
  ...
]

2) Get curriculum
GET /api/curriculums/:id
Headers: Authorization: Bearer <token>
Response: 200
{
  "curriculumId": "64f1...",
  "curriculumName": "Software Engineering 2022",
  "major": "Software Engineering",
  "totalSemester": 9,
  "yearApplied": 2022,
  "description": "..."
}

3) Get curriculum details
GET /api/curriculums/:id/details
Headers: Authorization: Bearer <token>
Response: 200
{
  "curriculum": { /* curriculum object as above */ },
  "details": [
    {
      "curriculumDetailId": "64f2...",
      "curriculumId": "64f1...",
      "curriculumName": "Software Engineering 2022",
      "major": "Software Engineering",
      "semester": 1,
      "subjectId": "64a3...",
      "subjectCode": "PRF192",
      "subjectName": "Cơ sở lập trình",
      "subjectEnglish": "Programming Fundamentals",
      "credits": 3,
      "type": "Foundation",
      "lecturer": "Dr. Nguyen Minh Khoa",
      "description": "Môn học...",
      "learningOutcomes": ["...", "..."]
    }
  ]
}

Notes:
- Endpoints require a valid JWT in Authorization header.
- CurriculumDetail contains denormalized subject snapshot fields; if not present, the API will attempt to populate from Subject model.
