const express = require("express");
const supabase = require("../supabaseClient");
const { requireAdmin  } = require("../middleware/auth");

const router = express.Router();

// 공개: 홈 이미지 조회
router.get("/home", async (req, res) => {
    const { data, error } = await supabase
        .from("home_image")
        .select("id, imageUrl:image_url, orderIndex:order_index, isActive:is_active")
        .eq("is_active", true)
        .order("order_index", { ascending: true });

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
});

// 관리자: 전체 조회
router.get("/admin/home", requireAdmin, async (req, res) => {
    const { data, error } = await supabase
        .from("home_image")
        .select("id, imageUrl:image_url, orderIndex:order_index, isActive:is_active")
        .order("order_index", { ascending: true });

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
});

// 관리자: 생성
router.post("/admin/home", requireAdmin , async (req, res) => {
    const { imageUrl, orderIndex, isActive } = req.body;
    const { error } = await supabase.from("home_image").insert({
        image_url: imageUrl,
        order_index: orderIndex,
        is_active: isActive,
    });

    if (error) return res.status(500).json({ message: error.message });
    res.status(201).json({ message: "생성 완료" });
});

// 관리자: 수정
router.put("/admin/home", requireAdmin , async (req, res) => {
    const { id, imageUrl, orderIndex, isActive } = req.body;
    const { error } = await supabase
        .from("home_image")
        .update({ image_url: imageUrl, order_index: orderIndex, is_active: isActive })
        .eq("id", id);

    if (error) return res.status(500).json({ message: error.message });
    res.json({ message: "수정 완료" });
});

// 관리자: 삭제
router.delete("/admin/home/:id", requireAdmin , async (req, res) => {
    const { error } = await supabase
        .from("home_image")
        .delete()
        .eq("id", req.params.id);

    if (error) return res.status(500).json({ message: error.message });
    res.json({ message: "삭제 완료" });
});

module.exports = router;