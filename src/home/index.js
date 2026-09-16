const express = require("express");
const supabase = require("../supabaseClient");
const { requireAdmin  } = require("../middleware/auth");

const router = express.Router();


// 공개: 홈 이미지 조회
router.get("/home", async (req, res) => {
    const { data, error } = await supabase
        .from("home_image")
        .select(
            "id, imageUrl:image_url, orderIndex:order_index, isActive:is_active, linkType:link_type, worksCode:works_code"
        )
        .eq("is_active", true)
        .order("order_index", { ascending: true });

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
});

// 공개: linkType + worksCode로 상세 조회
router.get("/works/:linkType/:worksCode", async (req, res) => {
    const { linkType, worksCode } = req.params;

    if (linkType === "interior") {
        const { data, error } = await supabase
            .from("project")
            .select("*")
            .eq("project_code", worksCode)
            .maybeSingle();

        if (error) return res.status(500).json({ message: error.message });
        if (!data) return res.status(404).json({ message: "해당 프로젝트를 찾을 수 없습니다." });

        return res.json({ type: "interior", data });
    }

    if (linkType === "furniture") {
        const { data, error } = await supabase
            .from("furniture")
            .select("*")
            .eq("furniture_code", worksCode)
            .maybeSingle();

        if (error) return res.status(500).json({ message: error.message });
        if (!data) return res.status(404).json({ message: "해당 가구를 찾을 수 없습니다." });

        return res.json({ type: "furniture", data });
    }

    return res.status(400).json({ message: "유효하지 않은 linkType입니다." });
});

// 관리자: 전체 조회
router.get("/admin/home", requireAdmin, async (req, res) => {
    const { data, error } = await supabase
        .from("home_image")
        .select(
            "id, imageUrl:image_url, orderIndex:order_index, isActive:is_active, linkType:link_type, worksCode:works_code"
        )
        .order("order_index", { ascending: true });

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
});

// 관리자: 생성
router.post("/admin/home", requireAdmin, async (req, res) => {
    const { imageUrl, orderIndex, isActive, linkType, worksCode } = req.body;
    const { error } = await supabase.from("home_image").insert({
        image_url: imageUrl,
        order_index: orderIndex,
        is_active: isActive,
        link_type: linkType ?? null,
        works_code: worksCode ?? null,
    });

    if (error) return res.status(500).json({ message: error.message });
    res.status(201).json({ message: "생성 완료" });
});

// 관리자: 수정
router.put("/admin/home", requireAdmin, async (req, res) => {
    console.log("PUT /admin/home body:", req.body); // 추가

    const { id, imageUrl, orderIndex, isActive, linkType, worksCode } = req.body;
    const { data, error } = await supabase
        .from("home_image")
        .update({
            image_url: imageUrl,
            order_index: orderIndex,
            is_active: isActive,
            link_type: linkType ?? null,
            works_code: worksCode ?? null,
        })
        .eq("id", id)
        .select(); // select() 추가해서 실제 업데이트된 row를 반환받기

    console.log("Supabase update 결과:", { data, error }); // 추가

    if (error) return res.status(500).json({ message: error.message });
    res.json({ message: "수정 완료", data });
});

// 관리자: 삭제
router.delete("/admin/home/:id", requireAdmin, async (req, res) => {
    const { error } = await supabase
        .from("home_image")
        .delete()
        .eq("id", req.params.id);

    if (error) return res.status(500).json({ message: error.message });
    res.json({ message: "삭제 완료" });
});


module.exports = router;