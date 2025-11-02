//account
{
  "email": "student-test2@fpt.edu.vn",
  "password": "$2b$10$8.0bV8G1Pa4y.1x./.d3e.iM1sY.53FFsds02w77f8tD1z5aQJ5Lq",
  "role": "student",
  "status": true
}

{
  "email": "lecturer-test2@fpt.edu.vn",
  "password": "$2b$10$8.0bV8G1Pa4y.1x./.d3e.iM1sY.53FFsds02w77f8tD1z5aQJ5Lq",
  "role": "lecturer",
  "status": true
}
//major
{
  "majorName": "Công nghệ thông tin2",
  "majorCode": "IT2",
  "status": 1
}
//year
{
  "name": "2027-2028",
  "startDate": { "$date": "2027-09-01T00:00:00.000Z" },
  "endDate": { "$date": "2028-08-31T00:00:00.000Z" },
  "status": true
}
//semester
{
  "semesterName": "SP27",
  "startDate": { "$date": "2027-10-20T00:00:00.000Z" },
  "endDate": { "$date": "2028-02-20T00:00:00.000Z" },
  "yearId": ObjectId("DÁN_ID_NĂM_HỌC_VÀO_ĐÂY"),
  "status": true
}

//curriculium
{
  "name": "Chương trình học CNTT K22",
  "status": "active",
  "majorId": ObjectId("DÁN_ID_CHUYÊN_NGÀNH_IT_VÀO_ĐÂY")
}

//subject

{
  "subjectName": "Nhập môn Lập trình 2",
  "subjectCode": "NMLT2",
  "subjectNoCredit": 3,
  "minAvgMarkToPass": 4,
  "status": true,
  "majorId": ObjectId("DÁN_ID_CHUYÊN_NGÀNH_IT_VÀO_ĐÂY")
}

{
  "subjectName": "Kỹ thuật Lập trình 2",
  "subjectCode": "KTLT2",
  "subjectNoCredit": 4,
  "minAvgMarkToPass": 4,
  "status": true,
  "majorId": ObjectId("DÁN_ID_CHUYÊN_NGÀNH_IT_VÀO_ĐÂY"),
  "preRequisite": [ ObjectId("DÁN_ID_MÔN_NMLT_VÀO_ĐÂY") ]
}

//curriculumdetails

[
  {
    "cdSemester": "1",
    "subjectId": ObjectId("DÁN_ID_MÔN_NMLT_VÀO_ĐÂY"),
    "curriculumId": ObjectId("DÁN_ID_CHƯƠNG_TRÌNH_HỌC_VÀO_ĐÂY")
  },
  {
    "cdSemester": "2",
    "subjectId": ObjectId("DÁN_ID_MÔN_KTLT_VÀO_ĐÂY"),
    "curriculumId": ObjectId("DÁN_ID_CHƯƠNG_TRÌNH_HỌC_VÀO_ĐÂY")
  }
]

//room
{ "roomCode": "A2-101", "roomName": "Phòng A2-101", "status": true }


//lecture
{
  "lecturerCode": "GV-IT-02",
  "lecturerAvatar": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "citizenID": 987654322, "firstName": "ALEX", "lastName": "Lecturer",
  "gender": true, "phone": "0123456789",
  "curriculumId": ObjectId("DÁN_ID_CHƯƠNG_TRÌNH_HỌC_VÀO_ĐÂY"),
  "accountId": ObjectId("DÁN_ID_ACCOUNT_LECTURER_VÀO_ĐÂY"),
  "majorId": ObjectId("DÁN_ID_CHUYÊN_NGÀNH_IT_VÀO_ĐÂY")
}

{
  "lecturerCode": "GV-IT-03",
  "lecturerAvatar": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "citizenID": 987654322, "firstName": "ALEX", "lastName": "Lecturer",
  "gender": true, "phone": "0123456789",
 "curriculumId": ObjectId("68fb0530ca4fd82df58a3db1"),
  "accountId": ObjectId("68fb45fcca4fd82df58a3dbd"),
  "majorId": ObjectId("68fb0451ca4fd82df58a3dae")
}

{
  "studentCode": "IT99992",
  "studentAvatar": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "firstName": "Tester2", "lastName": "Student", "citizenID": 123456729,
  "gender": true, "phone": "0987654321", "semesterNo": 1,
  "curriculumId": ObjectId("68fb0530ca4fd82df58a3db1"),
  "accountId": ObjectId("68fb45fcca4fd82df58a3dbd"),
  "majorId": ObjectId("68fb0451ca4fd82df58a3dae")
}


//GRADE
{
  "score": 9,
  "subjectId": ObjectId("DÁN_ID_MÔN_NMLT_VÀO_ĐÂY"),
  "studentId": ObjectId("DÁN_ID_SINH_VIÊN_VỪA_TẠO_VÀO_ĐÂY"),
  "componentId": ObjectId("652a3b1c8e1f6d3c4d5e6f7a") //CÁI NÀY ĐỂ MẶC ĐỊNH KO CẦN SỬA ID. NHƯNG VẪN PHẢI LÀ ObjectId
}