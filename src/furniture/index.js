const express = require("express");
const supabase = require("../supabaseClient");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

const FURNITURE_LIST_FIELDS =
    "id, furnitureCode:furniture_code, title, width, height, depth, thumbnailUrl:thumbnail_url, status, isPublic:is_public";

const FURNITURE_PUBLIC_LIST_FIELDS =
    "id, furnitureCode:furniture_code, title, width, height, depth, thumbnailUrl:thumbnail_url, isPublic:is_public";

const FURNITURE_DETAIL_FIELDS =
    "id, furnitureCode:furniture_code, title, width, height, depth, description, thumbnailUrl:thumbnail_url, status, isPublic:is_public";

const IMAGE_FIELDS = "id, furnitureId:furniture_id, imageUrl:image_url, orderIndex:order_index";

// ────────────────────────────────
// 관리자 순서 변경 (구체적인 경로이므로 :furnitureId보다 먼저 등록)
// ────────────────────────────────
router.patch("/admin/furniture/order", requireAdmin, async (req, res) => {
    const list = req.body; // [{ id, displayOrder }, ...]

    if (!Array.isArray(list)) {
        return res.status(400).json({ message: "잘못된 요청 형식입니다." });
    }

    const updates = list.map((item) =>
        supabase.from("furniture").update({ display_order: item.displayOrder }).eq("id", item.id)
    );

    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);

    if (failed) return res.status(500).json({ message: failed.error.message });

    res.json({ message: "순서 변경 완료" });
});

// ────────────────────────────────
// 공개 API
// ────────────────────────────────

// 공개: 가구 리스트
router.get("/public/furniture", async (req, res) => {
    const { data, error } = await supabase
        .from("furniture")
        .select(FURNITURE_PUBLIC_LIST_FIELDS)
        .eq("is_public", true)
        .order("display_order", { ascending: false });

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
});

// 공개: 가구 상세 (furnitureCode 기준)
router.get("/public/furniture/:furnitureCode", async (req, res) => {
    const { data: furniture, error } = await supabase
        .from("furniture")
        .select(FURNITURE_DETAIL_FIELDS)
        .eq("furniture_code", req.params.furnitureCode)
        .eq("is_public", true)
        .single();

    if (error || !furniture) {
        return res.status(404).json({ message: "가구를 찾을 수 없습니다." });
    }

    const { data: images, error: imgError } = await supabase
        .from("furniture_image")
        .select("image_url")
        .eq("furniture_id", furniture.id)
        .order("order_index", { ascending: true });

    if (imgError) return res.status(500).json({ message: imgError.message });

    res.json({ ...furniture, imageUrls: images.map((img) => img.image_url) }); // imageUrls 유지
});
// ────────────────────────────────
// 관리자 API
// ────────────────────────────────

// 관리자: 리스트 조회
router.get("/admin/furniture", requireAdmin, async (req, res) => {
    const { data, error } = await supabase
        .from("furniture")
        .select(FURNITURE_LIST_FIELDS)
        .order("display_order", { ascending: false });

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
});

// 관리자: 상세 조회
router.get("/admin/furniture/:furnitureId", requireAdmin, async (req, res) => {
    const { data: furniture, error } = await supabase
        .from("furniture")
        .select(FURNITURE_DETAIL_FIELDS)
        .eq("id", req.params.furnitureId)
        .single();

    if (error || !furniture) {
        return res.status(404).json({ message: "가구를 찾을 수 없습니다." });
    }

    const { data: images, error: imgError } = await supabase
        .from("furniture_image")
        .select(IMAGE_FIELDS) // id, furnitureId, imageUrl, orderIndex
        .eq("furniture_id", furniture.id)
        .order("order_index", { ascending: true });

    if (imgError) return res.status(500).json({ message: imgError.message });

    res.json({ ...furniture, images }); // 관리자는 원래도 images 배열(id 포함)로 받았음
});

// 관리자: 가구 등록
router.post("/admin/furniture", requireAdmin, async (req, res) => {
    const { furnitureCode, title, width, height, depth, description, thumbnailUrl, imageUrls } = req.body;

    const { data: maxData, error: maxError } = await supabase
        .from("furniture")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1);

    if (maxError) return res.status(500).json({ message: maxError.message });

    const nextOrder = (maxData?.[0]?.display_order || 0) + 1;

    const { data: inserted, error } = await supabase
        .from("furniture")
        .insert({
            furniture_code: furnitureCode,
            title,
            width,
            height,
            depth,
            description,
            thumbnail_url: thumbnailUrl,
            display_order: nextOrder,
        })
        .select()
        .single();

    if (error) return res.status(500).json({ message: error.message });

    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
        const imageRows = imageUrls.map((url, index) => ({
            furniture_id: inserted.id,
            image_url: url,
            order_index: index,
        }));
        const { error: imgError } = await supabase.from("furniture_image").insert(imageRows);
        if (imgError) return res.status(500).json({ message: imgError.message });
    }

    res.status(201).json({ message: "생성 완료", id: inserted.id });
});
// 관리자: 가구 수정
router.patch("/admin/furniture/:furnitureId", requireAdmin, async (req, res) => {
    const { furnitureCode, title, width, height, depth, description, status, isPublic, imageUrls } = req.body;

    const updateFields = {
        updated_at: new Date().toISOString(),
        ...(furnitureCode != null && { furniture_code: furnitureCode }),
        ...(title != null && { title }),
        ...(width != null && { width }),
        ...(height != null && { height }),
        ...(depth != null && { depth }),
        ...(description != null && { description }),
        ...(status != null && { status }),
        ...(isPublic != null && { is_public: isPublic }),
    };

    const { error } = await supabase.from("furniture").update(updateFields).eq("id", req.params.furnitureId);

    if (error) return res.status(500).json({ message: error.message });

    if (Array.isArray(imageUrls)) {
        const { error: delError } = await supabase
            .from("furniture_image")
            .delete()
            .eq("furniture_id", req.params.furnitureId);
        if (delError) return res.status(500).json({ message: delError.message });

        if (imageUrls.length > 0) {
            const imageRows = imageUrls.map((url, index) => ({
                furniture_id: req.params.furnitureId,
                image_url: url,
                order_index: index,
            }));
            const { error: imgError } = await supabase.from("furniture_image").insert(imageRows);
            if (imgError) return res.status(500).json({ message: imgError.message });
        }
    }


    res.json({ message: "수정 완료" });
});


// 관리자: 삭제
router.patch("/admin/furniture/:furnitureId/delete", requireAdmin, async (req, res) => {
    const { error: imgError } = await supabase
        .from("furniture_image")
        .delete()
        .eq("furniture_id", req.params.furnitureId);
    if (imgError) return res.status(500).json({ message: imgError.message });

    const { error } = await supabase.from("furniture").delete().eq("id", req.params.furnitureId);
    if (error) return res.status(500).json({ message: error.message });

    res.json({ message: "삭제 완료" });
});

// 관리자: 공개 여부 토글
router.patch("/admin/furniture/:furnitureId/public", requireAdmin, async (req, res) => {
    const { isPublic } = req.query;
    const { error } = await supabase
        .from("furniture")
        .update({ is_public: isPublic === "true" })
        .eq("id", req.params.furnitureId);

    if (error) return res.status(500).json({ message: error.message });
    res.json({ message: "공개 여부 변경 완료" });
});

module.exports = router;