const bcrypt = require("bcryptjs");

const password = "admin1234"; // 여기에 실제 쓸 비밀번호 입력

bcrypt.hash(password, 10).then((hash) => {
    console.log(hash);
});