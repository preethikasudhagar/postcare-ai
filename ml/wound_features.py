"""
ml/wound_features.py
--------------------
Clinical computer-vision feature extractor for surgical wound photograph assessment.
Computes multi-color-space statistical moments, tissue chromophore indicators,
color histograms, center-periphery wound margin gradients, and surface texture metrics.

Deterministic, CPU-optimized, and free of heavy GPU frameworks.
Shared identically across model training and production Django inference.
"""

from typing import Union, List
from pathlib import Path
import numpy as np
from PIL import Image


FEATURE_NAMES = [
    # Global RGB moments & ratios
    "rgb_r_mean", "rgb_r_std", "rgb_g_mean", "rgb_g_std", "rgb_b_mean", "rgb_b_std",
    "erythema_index_rgb", "red_green_diff",
    # HSV color moments & bands
    "hsv_h_mean", "hsv_h_std", "hsv_s_mean", "hsv_s_std", "hsv_v_mean", "hsv_v_std",
    "erythema_band_ratio", "slough_band_ratio", "necrotic_band_ratio",
    # HSV Hue histogram (12 bins)
    *[f"hue_hist_bin_{i}" for i in range(12)],
    # HSV Saturation histogram (6 bins)
    *[f"sat_hist_bin_{i}" for i in range(6)],
    # YCbCr moments (chrominance & erythema)
    "ycbcr_y_mean", "ycbcr_y_std", "ycbcr_cb_mean", "ycbcr_cb_std", "ycbcr_cr_mean", "ycbcr_cr_std",
    "cr_cb_diff",
    # Spatial center (wound bed) vs periphery (periwound margin) contrast
    "margin_red_contrast", "margin_erythema_contrast", "margin_val_contrast",
    "margin_cr_contrast", "margin_edge_contrast",
    # Edge & surface texture metrics
    "gradient_mean", "gradient_std", "gradient_p90", "gradient_max",
    "texture_roughness_mean", "texture_roughness_std"
]


def extract_wound_features(img_or_path: Union[str, Path, Image.Image]) -> np.ndarray:
    """
    Extracts a fixed-length 1D feature vector from a wound image.
    Standardizes image resolution to 256x256 before extraction.
    """
    if isinstance(img_or_path, (str, Path)):
        img = Image.open(img_or_path)
    else:
        img = img_or_path

    # Standardize to RGB and normalized size
    img_rgb = img.convert("RGB").resize((256, 256), Image.Resampling.BILINEAR)
    arr_rgb = np.array(img_rgb, dtype=np.float32) / 255.0  # (256, 256, 3) in [0, 1]

    # Channels
    r = arr_rgb[:, :, 0]
    g = arr_rgb[:, :, 1]
    b = arr_rgb[:, :, 2]

    # 1. RGB Moments & Ratios
    r_mean, r_std = float(np.mean(r)), float(np.std(r))
    g_mean, g_std = float(np.mean(g)), float(np.std(g))
    b_mean, b_std = float(np.mean(b)), float(np.std(b))
    erythema_rgb = float(np.mean(r / (g + b + 1e-4)))
    rg_diff = float(r_mean - g_mean)

    # 2. HSV Space
    img_hsv = img_rgb.convert("HSV")
    arr_hsv = np.array(img_hsv, dtype=np.float32) / 255.0  # H, S, V in [0, 1]
    h = arr_hsv[:, :, 0]
    s = arr_hsv[:, :, 1]
    v = arr_hsv[:, :, 2]

    h_mean, h_std = float(np.mean(h)), float(np.std(h))
    s_mean, s_std = float(np.mean(s)), float(np.std(s))
    v_mean, v_std = float(np.mean(v)), float(np.std(v))

    # Clinically meaningful tissue color bands:
    # Erythema (inflamed red tissue): Hue close to 0/1, saturation > 0.25
    erythema_mask = ((h < 0.08) | (h > 0.92)) & (s > 0.25)
    erythema_ratio = float(np.mean(erythema_mask))

    # Slough / fibrinous exudate (yellow/pale creamy tissue): Hue around yellow (0.10 - 0.22), S > 0.20
    slough_mask = (h >= 0.10) & (h <= 0.22) & (s > 0.20)
    slough_ratio = float(np.mean(slough_mask))

    # Necrotic / eschar tissue (dark/black avascular tissue): V < 0.22
    necrotic_mask = (v < 0.22)
    necrotic_ratio = float(np.mean(necrotic_mask))

    # Histograms
    h_hist, _ = np.histogram(h, bins=12, range=(0.0, 1.0), density=True)
    h_hist = [float(x) for x in h_hist]

    s_hist, _ = np.histogram(s, bins=6, range=(0.0, 1.0), density=True)
    s_hist = [float(x) for x in s_hist]

    # 3. YCbCr Space (Clinical chrominance & erythema measurement)
    img_ycb = img_rgb.convert("YCbCr")
    arr_ycb = np.array(img_ycb, dtype=np.float32) / 255.0
    y_ch = arr_ycb[:, :, 0]
    cb_ch = arr_ycb[:, :, 1]
    cr_ch = arr_ycb[:, :, 2]  # Red chrominance

    y_mean, y_std = float(np.mean(y_ch)), float(np.std(y_ch))
    cb_mean, cb_std = float(np.mean(cb_ch)), float(np.std(cb_ch))
    cr_mean, cr_std = float(np.mean(cr_ch)), float(np.std(cr_ch))
    cr_cb_diff = float(cr_mean - cb_mean)

    # 4. Center vs Periphery Spatial Contrast
    # Center box (50% area = inner [64:192, 64:192])
    center_slice = slice(64, 192)
    c_r = r[center_slice, center_slice]
    c_v = v[center_slice, center_slice]
    c_cr = cr_ch[center_slice, center_slice]

    # Create perimeter mask (inverse of center box)
    periph_mask = np.ones((256, 256), dtype=bool)
    periph_mask[center_slice, center_slice] = False

    p_r = r[periph_mask]
    p_v = v[periph_mask]
    p_cr = cr_ch[periph_mask]

    margin_r_contrast = float(np.mean(c_r) - np.mean(p_r))
    margin_erythema_contrast = float(
        np.mean(c_r / (g[center_slice, center_slice] + b[center_slice, center_slice] + 1e-4)) -
        np.mean(p_r / (g[periph_mask] + b[periph_mask] + 1e-4))
    )
    margin_v_contrast = float(np.mean(c_v) - np.mean(p_v))
    margin_cr_contrast = float(np.mean(c_cr) - np.mean(p_cr))

    # 5. Spatial Edge Gradients & Texture Roughness
    img_gray = img_rgb.convert("L")
    arr_gray = np.array(img_gray, dtype=np.float32) / 255.0

    # Finite difference gradients
    gx = np.abs(arr_gray[:, 1:] - arr_gray[:, :-1])
    gy = np.abs(arr_gray[1:, :] - arr_gray[:-1, :])
    grad_mag = np.sqrt(gx[:-1, :]**2 + gy[:, :-1]**2)

    grad_mean = float(np.mean(grad_mag))
    grad_std = float(np.std(grad_mag))
    grad_p90 = float(np.percentile(grad_mag, 90))
    grad_max = float(np.max(grad_mag))

    # Edge contrast between center and perimeter
    c_grad = grad_mag[64:191, 64:191]
    p_grad_mask = np.ones_like(grad_mag, dtype=bool)
    p_grad_mask[64:191, 64:191] = False
    margin_edge_contrast = float(np.mean(c_grad) - np.mean(grad_mag[p_grad_mask]))

    # Patch-based texture roughness (16x16 blocks)
    blocks = arr_gray.reshape(16, 16, 16, 16)
    block_stds = np.std(blocks, axis=(1, 3))
    roughness_mean = float(np.mean(block_stds))
    roughness_std = float(np.std(block_stds))

    # Assemble feature vector
    feats = [
        r_mean, r_std, g_mean, g_std, b_mean, b_std,
        erythema_rgb, rg_diff,
        h_mean, h_std, s_mean, s_std, v_mean, v_std,
        erythema_ratio, slough_ratio, necrotic_ratio,
        *h_hist,
        *s_hist,
        y_mean, y_std, cb_mean, cb_std, cr_mean, cr_std,
        cr_cb_diff,
        margin_r_contrast, margin_erythema_contrast, margin_v_contrast,
        margin_cr_contrast, margin_edge_contrast,
        grad_mean, grad_std, grad_p90, grad_max,
        roughness_mean, roughness_std
    ]

    return np.array(feats, dtype=np.float32)
