require("dotenv").config();
const bcrypt = require("bcryptjs");
const supabase = require("../src/supabaseClient");

async function test() {
    const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", "admin")
        .single();

    console.log("조회된 user:", user);
    console.log("조회 에러:", error);

    if (user) {
        const isMatch = await bcrypt.compare("admin1234", user.password);
        console.log("비밀번호 일치 여부:", isMatch);
    }
}

test();