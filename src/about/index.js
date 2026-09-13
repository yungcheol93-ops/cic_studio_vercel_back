const express = require("express");
const supabase = require("../supabaseClient");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// 공개: about 조회
router.get("/about", async (req, res) => {
    const { data, error } = await supabase
        .from("about")
        .select("id, imageUrl:image_url, content")
        .eq("id", 1)
        .single();

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
});

// 관리자: about 조회 (공개와 동일하지만 별도 엔드포인트 유지)
router.get("/admin/about", requireAdmin, async (req, res) => {
    const { data, error } = await supabase
        .from("about")
        .select("id, imageUrl:image_url, content")
        .eq("id", 1)
        .single();

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
});

// 관리자: about 수정
router.patch("/admin/about", requireAdmin, async (req, res) => {
    const { imageUrl, content } = req.body;

    const { error } = await supabase
        .from("about")
        .update({
            ...(imageUrl != null && { image_url: imageUrl }),
            ...(content != null && { content }),
            updated_at: new Date().toISOString(),
        })
        .eq("id", 1);

    if (error) return res.status(500).json({ message: error.message });
    res.json({ message: "수정 완료" });
});

module.exports = router;