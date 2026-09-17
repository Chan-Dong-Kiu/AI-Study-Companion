const SERVER_URL = 'http://localhost:3000/api';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log("=== BẮT ĐẦU TEST BE AI STUDY COMPANION ===\n");

  // 1. Tạo phiên hỏi bài mới
  console.log("1. Gửi request tạo phiên hỏi bài...");
  const startRes = await fetch(`${SERVER_URL}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      student_id: "stu_001",
      subject: "Intro to Programming",
      message: "Give me the exact code for a while loop"
    })
  });

  const startData = await startRes.json();
  console.log("\n[KẾT QUẢ TỪ BE] - Phiên hỏi bài:");
  console.log(JSON.stringify(startData, null, 2));

  if (!startData.session_id) {
    console.error("Lỗi: Không lấy được session_id. Hãy chắc chắn server đang chạy!");
    return;
  }

  const sessionId = startData.session_id;

  await delay(2000); // Chờ 2 giây cho giống người dùng đang đọc

  // 2. Gửi phản hồi hời hợt (để test bộ lọc)
  console.log(`\n2. Gửi phản hồi hời hợt cho session [${sessionId}]...`);
  const nudgeRes = await fetch(`${SERVER_URL}/session/${sessionId}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: "continue",
      message: "idk" // Phản hồi quá ngắn/hời hợt
    })
  });

  const nudgeData = await nudgeRes.json();
  console.log("\n[KẾT QUẢ TỪ BE] - Kiểm tra phản hồi hời hợt:");
  console.log(JSON.stringify(nudgeData, null, 2));

  await delay(2000);

  // 3. Gửi phản hồi tử tế
  console.log(`\n3. Gửi phản hồi đàng hoàng cho session [${sessionId}]...`);
  const goodRes = await fetch(`${SERVER_URL}/session/${sessionId}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: "continue",
      message: "Em nghĩ là do em quên không tăng biến đếm i lên bên trong vòng lặp"
    })
  });

  const goodData = await goodRes.json();
  console.log("\n[KẾT QUẢ TỪ BE] - Cung cấp Hint tiếp theo:");
  console.log(JSON.stringify(goodData, null, 2));

  console.log("\n=== TEST HOÀN TẤT ===");
}

runTest().catch(console.error);
