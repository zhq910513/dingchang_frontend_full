// src/utils/imagePreprocess.js
/**
 * 前端图片预处理（>2MB 触发）：缩放 + 轻压缩
 * 目标：不伤 OCR 清晰度，优先缩边，其次轻降质量，quality 不低于 0.78
 *
 * 稳妥增强：
 * 1) 任意预处理失败都降级为“返回原图”，不影响上传主流程
 * 2) 处理 ctx/toBlob/解码失败等边界
 * 3) 用完 ImageBitmap 后主动 close()，避免内存泄漏
 */

const MB = 1024 * 1024;

const SLOT_RULES = {
    // 行驶证：百度限制更严格（你给的是 base64+urlencode <= 4M），用更保守的 raw 目标
    driving_license_main: {maxEdge: 4096, targetBytes: Math.floor(2.6 * MB), minShortEdge: 900},
    driving_license_sub: {maxEdge: 4096, targetBytes: Math.floor(2.6 * MB), minShortEdge: 900},

    // 合格证：你给的是 base64+urlencode <= 8M；合格证最长边最大 4096
    vehicle_cert: {maxEdge: 4096, targetBytes: Math.floor(5.2 * MB), minShortEdge: 900},

    // 身份证：你给的是最长边最大 8192；这里按 8192 放开，避免过度缩小影响细节
    idcard_front: {maxEdge: 8192, targetBytes: Math.floor(5.2 * MB), minShortEdge: 800},
    idcard_back: {maxEdge: 8192, targetBytes: Math.floor(5.2 * MB), minShortEdge: 800},

    // 相关图片：按“高清优先”处理；仍然遵循 >2MB 触发
    related: {maxEdge: 4096, targetBytes: Math.floor(8.0 * MB), minShortEdge: 800},
};

function ruleOf(slotKey) {
    return (
        SLOT_RULES[String(slotKey || "").trim()] || {
            maxEdge: 4096,
            targetBytes: Math.floor(8.0 * MB),
            minShortEdge: 800
        }
    );
}

function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
}

function safeRevokeObjectURL(u) {
    if (!u) return;
    try {
        URL.revokeObjectURL(u);
    } catch {
        // ignore
    }
}

function isImageFile(file) {
    const t = String(file?.type || "").toLowerCase();
    if (t.startsWith("image/")) return true;
    // 有些环境 file.type 为空，兜底用后缀判断
    const name = String(file?.name || "").toLowerCase();
    return /\.(jpg|jpeg|png|bmp|webp|heic)$/i.test(name);
}

async function fileToImageBitmap(file) {
    // 优先 createImageBitmap（支持 imageOrientation: from-image）
    try {
        return await createImageBitmap(file, {imageOrientation: "from-image"});
    } catch {
        // fallback: <img> + canvas
        const url = URL.createObjectURL(file);
        try {
            const img = await new Promise((resolve, reject) => {
                const el = new Image();
                // 跨域不相关（本地 blob），但加上更稳
                el.crossOrigin = "anonymous";
                el.onload = () => resolve(el);
                el.onerror = reject;
                el.src = url;
            });

            const w = img.naturalWidth || img.width || 0;
            const h = img.naturalHeight || img.height || 0;
            if (!w || !h) throw new Error("图片尺寸读取失败");

            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;

            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("无法获取画布上下文");

            ctx.drawImage(img, 0, 0);

            return await createImageBitmap(canvas);
        } finally {
            safeRevokeObjectURL(url);
        }
    }
}

function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob || null), type, quality);
    });
}

function pickOutputType(file) {
    // 为了控体积与 OCR 稳定性：统一转 JPEG（PNG/BMP 原图过大时收益明显）
    return "image/jpeg";
}

function buildOutputName(file) {
    const base = (file?.name || "image").replace(/\.(jpg|jpeg|png|bmp|webp|heic)$/i, "");
    return `${base}.jpg`;
}

function fallbackResult(file) {
    const beforeBytes = file?.size || 0;
    return {
        file,
        changed: false,
        note: "",
        beforeBytes,
        afterBytes: beforeBytes,
    };
}

/**
 * @returns {Promise<{file: File, changed: boolean, note: string, beforeBytes: number, afterBytes: number}>}
 */
export async function preprocessImageForUpload({file, slotKey}) {
    const f = file;
    if (!f) return fallbackResult(f);

    const beforeBytes = f.size || 0;

    // 非图片文件：不处理，直接返回
    if (!isImageFile(f)) return fallbackResult(f);

    const r = ruleOf(slotKey);
    const maxEdge = Number(r.maxEdge) || 4096;
    const targetBytes = Number(r.targetBytes) || Math.floor(8.0 * MB);
    const minShortEdge = Number(r.minShortEdge) || 800;

    // ✅ 统一阈值：>2MB 进入预处理
    const shouldEnter = beforeBytes > 2 * MB;

    let bmp = null;
    try {
        bmp = await fileToImageBitmap(f);
        const w0 = bmp?.width || 0;
        const h0 = bmp?.height || 0;
        if (!w0 || !h0) return fallbackResult(f);

        const maxSide0 = Math.max(w0, h0);
        const minSide0 = Math.min(w0, h0);

        // 是否需要处理：>2MB 或 超边
        const needResize = maxSide0 > maxEdge;
        const needProcess = shouldEnter || needResize;

        if (!needProcess) return fallbackResult(f);

        // 初始缩放：先满足 maxEdge
        let scale = needResize ? maxEdge / maxSide0 : 1;

        // 保护：短边不能低于 minShortEdge（宁可稍大点体积）
        if (minSide0 * scale < minShortEdge) {
            scale = clamp(minShortEdge / minSide0, 0.1, 1);
        }

        // 初始 quality：尽量高
        let quality = 0.92;
        const qualityMin = 0.78;

        const outType = pickOutputType(f);

        let bestBlob = null;
        let bestScore = Number.POSITIVE_INFINITY;

        // 多轮迭代：先轻降质量，再缩尺寸
        for (let round = 0; round < 10; round++) {
            const w = Math.max(1, Math.round(w0 * scale));
            const h = Math.max(1, Math.round(h0 * scale));

            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;

            const ctx = canvas.getContext("2d", {alpha: false});
            if (!ctx) break;

            // 更偏清晰的采样
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(bmp, 0, 0, w, h);

            const blob = await canvasToBlob(canvas, outType, quality);
            if (!blob) break;

            const size = blob.size;

            // 评分：优先满足 targetBytes；越接近越好；同时尽量不比原图更大
            const over = Math.max(0, size - targetBytes);
            const score = over + Math.max(0, size - beforeBytes);

            if (score < bestScore) {
                bestScore = score;
                bestBlob = blob;
            }

            // ✅ 达标：直接收敛
            if (size <= targetBytes) {
                bestBlob = blob;
                break;
            }

            // 还超：先降 quality 到下限，再缩尺寸
            if (quality > qualityMin) {
                quality = Math.max(qualityMin, quality - 0.04);
            } else {
                // 缩尺寸（小步）
                const nextScale = scale * 0.92;
                // 再次保护短边
                if (Math.min(w0, h0) * nextScale < minShortEdge) {
                    break;
                }
                scale = nextScale;
                // 缩尺寸后把 quality 拉回一点，避免继续糊字
                quality = 0.86;
            }
        }

        if (!bestBlob) return fallbackResult(f);

        // ✅ 防止“压完反而更大”导致无意义处理（尤其是非缩边场景）
        if (!needResize && bestBlob.size >= beforeBytes) {
            return fallbackResult(f);
        }

        const outFile = new File([bestBlob], buildOutputName(f), {type: outType, lastModified: Date.now()});
        const afterBytes = outFile.size;

        const changed = afterBytes !== beforeBytes || outFile.type !== f.type;
        const note = changed
            ? `已优化：${(beforeBytes / MB).toFixed(2)}MB → ${(afterBytes / MB).toFixed(2)}MB（最长边≤${maxEdge}px，Q≥${0.78}）`
            : "";

        return {file: outFile, changed, note, beforeBytes, afterBytes};
    } catch (e) {
        // ✅ 任何预处理异常都不影响上传主流程：降级为原图
        console.warn("[图片预处理失败，已自动跳过]", e);
        return fallbackResult(f);
    } finally {
        // ✅ 释放 ImageBitmap（避免大图处理后内存飙涨）
        try {
            if (bmp && typeof bmp.close === "function") bmp.close();
        } catch {
            // ignore
        }
    }
}
