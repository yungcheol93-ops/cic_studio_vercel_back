const express = require("express");
const supabase = require("../supabaseClient");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

const PROJECT_LIST_FIELDS =
    "id, projectCode:project_code, completion, thumbnailUrls:thumbnail_urls, status, isPublic:is_public";

const PROJECT_PUBLIC_LIST_FIELDS =
    "id, projectCode:project_code, completion, thumbnailUrls:thumbnail_urls, isPublic:is_public";

const PROJECT_DETAIL_FIELDS =
    "id, projectCode:project_code, completion, location, type, scope, photography, description, status, thumbnailUrls:thumbnail_urls, isPublic:is_public";

const IMAGE_FIELDS = "id, projectId:project_id, imageUrl:image_url, orderIndex:order_index";

// ────────────────────────────────
// 관리자 순서 변경 (구체적인 경로이므로 :projectId보다 먼저 등록)
// ────────────────────────────────
router.patch("/admin/project/order", requireAdmin, async (req, res) => {
    const list = req.body; // [{ id, displayOrder }, ...]

    if (!Array.isArray(list)) {
        return res.status(400).json({ message: "잘못된 요청 형식입니다." });
    }

    const updates = list.map((item) =>
        supabase.from("project").update({ display_order: item.displayOrder }).eq("id", item.id)
    );

    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);

    if (failed) return res.status(500).json({ message: failed.error.message });

    res.json({ message: "순서 변경 완료" });
});

// ────────────────────────────────
// 공개 API
// ────────────────────────────────

// 공개: 프로젝트 리스트
router.get("/public/project", async (req, res) => {
    const { data, error } = await supabase
        .from("project")
        .select(PROJECT_PUBLIC_LIST_FIELDS)
        .eq("is_public", true)
        .order("display_order", { ascending: false });

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
});

// 공개: 프로젝트 상세 (projectCode 기준) → imageUrls 문자열 배열
router.get("/public/project/:projectCode", async (req, res) => {
    const { data: project, error } = await supabase
        .from("project")
        .select(PROJECT_DETAIL_FIELDS)
        .eq("project_code", req.params.projectCode)
        .eq("is_public", true)
        .single();

    if (error || !project) {
        return res.status(404).json({ message: "프로젝트를 찾을 수 없습니다." });
    }

    const { data: images, error: imgError } = await supabase
        .from("project_image")
        .select("image_url")
        .eq("project_id", project.id)
        .order("order_index", { ascending: true });

    if (imgError) return res.status(500).json({ message: imgError.message });

    res.json({ ...project, imageUrls: images.map((img) => img.image_url) });
});

// ────────────────────────────────
// 관리자 API
// ────────────────────────────────

// 관리자: 리스트 조회
router.get("/admin/project", requireAdmin, async (req, res) => {
    const { data, error } = await supabase
        .from("project")
        .select(PROJECT_LIST_FIELDS)
        .order("display_order", { ascending: false });

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
});

// 관리자: 상세 조회 → images 객체 배열 (id 포함)
router.get("/admin/project/:projectId", requireAdmin, async (req, res) => {
    const { data: project, error } = await supabase
        .from("project")
        .select(PROJECT_DETAIL_FIELDS)
        .eq("id", req.params.projectId)
        .single();

    if (error || !project) {
        return res.status(404).json({ message: "프로젝트를 찾을 수 없습니다." });
    }

    const { data: images, error: imgError } = await supabase
        .from("project_image")
        .select(IMAGE_FIELDS)
        .eq("project_id", project.id)
        .order("order_index", { ascending: true });

    if (imgError) return res.status(500).json({ message: imgError.message });

    res.json({ ...project, images });
});

// 관리자: 프로젝트 등록 (요청 바디: imageUrls 문자열 배열)
router.post("/admin/project", requireAdmin, async (req, res) => {
    const { projectCode, completion, location, type, scope, photography, description,
        thumbnailUrls, imageUrls } = req.body;

    const { data: maxData, error: maxError } = await supabase
        .from("project")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1);

    if (maxError) return res.status(500).json({ message: maxError.message });

    const nextOrder = (maxData?.[0]?.display_order || 0) + 1;

    const { data: inserted, error } = await supabase
        .from("project")
        .insert({
            project_code: projectCode,
            completion,
            location,
            type,
            scope,
            photography,
            description,
            thumbnail_urls: thumbnailUrls || [],
            display_order: nextOrder,
        })
        .select()
        .single();

    if (error) return res.status(500).json({ message: error.message });

    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
        const imageRows = imageUrls.map((url, index) => ({
            project_id: inserted.id,
            image_url: url,
            order_index: index,
        }));
        const { error: imgError } = await supabase.from("project_image").insert(imageRows);
        if (imgError) return res.status(500).json({ message: imgError.message });
    }

    res.status(201).json({ message: "생성 완료", id: inserted.id });
});

// 관리자: 프로젝트 수정 (요청 바디: imageUrls 문자열 배열)
router.patch("/admin/project/:projectId", requireAdmin, async (req, res) => {
    const {
        projectCode, completion, location, type, scope, photography, description,
        status, isPublic, thumbnailUrls, imageUrls,
    } = req.body;


    const updateFields = {
        updated_at: new Date().toISOString(),
        ...(projectCode != null && { project_code: projectCode }),
        ...(completion != null && { completion }),
        ...(location != null && { location }),
        ...(type != null && { type }),
        ...(scope != null && { scope }),
        ...(photography != null && { photography }),
        ...(description != null && { description }),
        ...(status != null && { status }),
        ...(isPublic != null && { is_public: isPublic }),
        ...(thumbnailUrls != null && { thumbnail_urls: thumbnailUrls }),
    };

    const { error } = await supabase.from("project").update(updateFields).eq("id", req.params.projectId);
    if (error) return res.status(500).json({ message: error.message });

    if (Array.isArray(imageUrls)) {
        const { error: delError } = await supabase
            .from("project_image")
            .delete()
            .eq("project_id", req.params.projectId);
        if (delError) return res.status(500).json({ message: delError.message });

        if (imageUrls.length > 0) {
            const imageRows = imageUrls.map((url, index) => ({
                project_id: req.params.projectId,
                image_url: url,
                order_index: index,
            }));
            const { error: imgError } = await supabase.from("project_image").insert(imageRows);
            if (imgError) return res.status(500).json({ message: imgError.message });
        }
    }

    res.json({ message: "수정 완료" });
});

// 관리자: 삭제
router.patch("/admin/project/:projectId/delete", requireAdmin, async (req, res) => {
    const { error: imgError } = await supabase
        .from("project_image")
        .delete()
        .eq("project_id", req.params.projectId);
    if (imgError) return res.status(500).json({ message: imgError.message });

    const { error } = await supabase.from("project").delete().eq("id", req.params.projectId);
    if (error) return res.status(500).json({ message: error.message });

    res.json({ message: "삭제 완료" });
});

// 관리자: 공개 여부 토글
router.patch("/admin/project/:projectId/public", requireAdmin, async (req, res) => {
    const { isPublic } = req.query;
    const { error } = await supabase
        .from("project")
        .update({ is_public: isPublic === "true" })
        .eq("id", req.params.projectId);

    if (error) return res.status(500).json({ message: error.message });
    res.json({ message: "공개 여부 변경 완료" });
});

module.exports = router;