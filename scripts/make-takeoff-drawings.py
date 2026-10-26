#!/usr/bin/env python3
"""Synthetic structural and architectural drawings with hand-computed quantities.

These are original test drawings (no third-party drawing content). The truth
JSON is computed here, separately from the TypeScript take-off, so the unit
tests can compare the two implementations.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

OUT = Path(__file__).resolve().parents[1] / "eval" / "takeoff" / "drawings"
OUT.mkdir(parents=True, exist_ok=True)


def dim_h(ax, x1, x2, y, text):
    ax.annotate(
        "",
        (x1, y),
        (x2, y),
        arrowprops=dict(arrowstyle="<->", lw=0.8, color="black"),
    )
    ax.text((x1 + x2) / 2, y + 0.12, text, ha="center", va="bottom", fontsize=11)


def dim_v(ax, y1, y2, x, text):
    ax.annotate(
        "",
        (x, y1),
        (x, y2),
        arrowprops=dict(arrowstyle="<->", lw=0.8, color="black"),
    )
    ax.text(x - 0.12, (y1 + y2) / 2, text, rotation=90, va="center", ha="right", fontsize=11)


def save(fig, stem: str):
    png = OUT / f"{stem}.png"
    pdf = OUT / f"{stem}.pdf"
    fig.savefig(png, dpi=160, bbox_inches="tight", facecolor="white")
    fig.savefig(pdf, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return png, pdf


def draw_s101():
    gx = {"A": 0.0, "B": 4.0, "C": 8.0}
    gy = {"1": 0.0, "2": 6.0}
    F = {"F1": (1.8, 0.5), "F2": (2.2, 0.6)}
    foot_at = {
        ("A", "1"): "F1",
        ("C", "1"): "F1",
        ("A", "2"): "F1",
        ("C", "2"): "F1",
        ("B", "1"): "F2",
        ("B", "2"): "F2",
    }
    SL, SW, ST = 8.0, 6.0, 0.20
    COL, COLH = 0.40, 3.00

    fig, ax = plt.subplots(figsize=(16.5, 11.7))
    ax.set_aspect("equal")
    ax.axis("off")
    ax.add_patch(Rectangle((0, 0), SL, SW, fill=False, lw=2.2))
    ax.text(
        SL / 2,
        SW / 2 + 0.35,
        "SLAB S1\n200 mm THK RC SLAB (C30)\nBOTTOM: T12 @ 150 B.W.\nTOP: NIL (single mesh)",
        ha="center",
        va="center",
        fontsize=12,
    )
    for (cx, cy), f in foot_at.items():
        x, y = gx[cx], gy[cy]
        s = F[f][0]
        ax.add_patch(Rectangle((x - s / 2, y - s / 2), s, s, fill=False, ls="--", lw=1.2, color="0.35"))
        ax.add_patch(Rectangle((x - COL / 2, y - COL / 2), COL, COL, color="black"))
        ax.text(x + 0.28, y + 0.28, f"C1 / {f}", fontsize=10)
    for k, v in gx.items():
        ax.plot([v, v], [-1.9, SW + 1.9], ls="-.", lw=0.6, color="0.5")
        ax.add_patch(plt.Circle((v, SW + 2.25), 0.32, fill=False))
        ax.text(v, SW + 2.25, k, ha="center", va="center", fontsize=12)
    for k, v in gy.items():
        ax.plot([-1.9, SL + 1.9], [v, v], ls="-.", lw=0.6, color="0.5")
        ax.add_patch(plt.Circle((-2.25, v), 0.32, fill=False))
        ax.text(-2.25, v, k, ha="center", va="center", fontsize=12)
    dim_h(ax, 0, 4, -1.35, "4000")
    dim_h(ax, 4, 8, -1.35, "4000")
    dim_h(ax, 0, 8, -2.05, "8000")
    dim_v(ax, 0, 6, SL + 1.45, "6000")
    notes = (
        "FOOTING SCHEDULE (isolated pad, C30)\n"
        "F1  1800 x 1800 x 500 thk  (4 no.)  BOTTOM T16 @ 200 B.W.\n"
        "F2  2200 x 2200 x 600 thk  (2 no.)  BOTTOM T16 @ 200 B.W.\n"
        "COLUMN C1  400 x 400, 6 no., height 3000 (top of footing to soffit of slab), rebar by others\n"
        "\n"
        "NOTES\n"
        "1. All dimensions in mm. Slab edge flush with grid lines (slab 8000 x 6000).\n"
        "2. Covers: slab 25 mm, footings 75 mm. Straight bars, no laps or hooks.\n"
        "3. 50 mm C15 blinding under footings, projecting 100 mm each side.\n"
        "4. Underside of blinding at -1.55 m below NGL. Excavation with vertical sides,\n"
        "   300 mm working space each side beyond footing.\n"
        "5. Steel unit mass: T12 = 0.888 kg/m, T16 = 1.578 kg/m."
    )
    ax.text(
        SL + 3.1,
        SW + 1.7,
        notes,
        va="top",
        fontsize=10,
        family="DejaVu Sans",
        bbox=dict(boxstyle="square", fc="white", ec="black", pad=0.5),
    )
    ax.text(
        -2.6,
        -2.9,
        "SAMPLE DRAWING S-101  |  RC SLAB & FOOTING PLAN  |  Scale NTS  |  Synthetic test drawing (not a real project)",
        fontsize=9,
    )
    ax.set_xlim(-3.2, 20.2)
    ax.set_ylim(-3.4, 9.2)
    save(fig, "S101")

    q = {}
    q["slab_concrete_m3"] = SL * SW * ST
    q["slab_soffit_formwork_m2"] = SL * SW
    q["slab_edge_formwork_m2"] = 2 * (SL + SW) * ST
    q["column_concrete_m3"] = 6 * COL * COL * COLH
    q["column_formwork_m2"] = 6 * 4 * COL * COLH
    fc = {f: sum(1 for v in foot_at.values() if v == f) for f in F}
    q["footing_concrete_m3"] = sum(fc[f] * F[f][0] ** 2 * F[f][1] for f in F)
    q["footing_side_formwork_m2"] = sum(fc[f] * 4 * F[f][0] * F[f][1] for f in F)
    q["blinding_m3"] = sum(fc[f] * (F[f][0] + 0.2) ** 2 * 0.05 for f in F)
    q["excavation_m3"] = sum(fc[f] * (F[f][0] + 0.6) ** 2 * 1.55 for f in F)
    cover = 0.025
    sp = 0.15
    n_long = math.floor((SW - 2 * cover) / sp) + 1
    n_short = math.floor((SL - 2 * cover) / sp) + 1
    t12_m = n_long * (SL - 2 * cover) + n_short * (SW - 2 * cover)
    q["slab_T12_m"] = t12_m
    q["slab_T12_kg"] = t12_m * 0.888
    t16_m = 0.0
    for _f, (s, _t) in F.items():
        length = s - 2 * 0.075
        n = math.floor(length / 0.2) + 1
        per = 2 * n * length
        t16_m += fc[_f] * per
    q["footing_T16_m"] = t16_m
    q["footing_T16_kg"] = t16_m * 1.578
    q["total_concrete_C30_m3"] = q["slab_concrete_m3"] + q["column_concrete_m3"] + q["footing_concrete_m3"]
    q["total_rebar_kg"] = q["slab_T12_kg"] + q["footing_T16_kg"]
    return {k: round(v, 3) if isinstance(v, float) else v for k, v in q.items()}


def draw_s102():
    """Closed rectangular strip footing. Centreline method, stated on the sheet."""
    # External rectangle 10.0 m x 8.0 m to the footing centreline.
    length = 2 * (10.0 + 8.0)  # 36.0 m closed centreline
    width = 0.60
    thick = 0.40
    cover = 0.050
    spacing = 0.200
    long_bars = 3
    depth = 1.20
    working = 0.250
    blind_thk = 0.050
    blind_proj = 0.100
    t12 = 0.888
    t10 = 0.617

    fig, ax = plt.subplots(figsize=(16.5, 11.7))
    ax.set_aspect("equal")
    ax.axis("off")
    # Draw the centreline rectangle and the footing width.
    x0, y0, L, W = 0.0, 0.0, 10.0, 8.0
    ax.add_patch(Rectangle((x0, y0), L, W, fill=False, lw=1.0, ls="-."))
    ax.add_patch(Rectangle((x0 - width / 2, y0 - width / 2), L + width, W + width, fill=False, lw=1.6))
    ax.add_patch(Rectangle((x0 + width / 2, y0 + width / 2), L - width, W - width, fill=False, lw=1.6))
    ax.text(L / 2, W / 2, "STRIP FOOTING SF1\nclosed centreline\n10000 x 8000", ha="center", va="center", fontsize=12)
    dim_h(ax, 0, 10, -1.3, "10000")
    dim_v(ax, 0, 8, 11.3, "8000")
    notes = (
        "STRIP FOOTING SCHEDULE (C25)\n"
        "SF1  600 x 400 thk  centreline 36000 mm closed  (1 no.)  LONG 3 T12  TRANSVERSE T10 @ 200\n"
        "\n"
        "NOTES\n"
        "1. All dimensions in mm. SF1 is one closed rectangular strip.\n"
        "2. Centreline length 36000 mm = 2 x (10000 + 8000). Do not add corners again.\n"
        "3. Cover: footings 50 mm. Straight bars, no laps or hooks.\n"
        "4. 50 mm C15 blinding under the strip, projecting 100 mm each side.\n"
        "5. Underside of blinding at -1.20 m below NGL. Excavation with vertical sides,\n"
        "   250 mm working space each side beyond the strip.\n"
        "6. Steel unit mass: T12 = 0.888 kg/m, T10 = 0.617 kg/m.\n"
        "7. No wastage is shown on this drawing."
    )
    ax.text(
        -0.4,
        11.6,
        notes,
        va="top",
        fontsize=11,
        family="DejaVu Sans",
        bbox=dict(boxstyle="square", fc="white", ec="black", pad=0.5),
    )
    ax.text(
        -0.4,
        -2.3,
        "SAMPLE DRAWING S-102  |  STRIP FOOTING PLAN  |  Scale NTS  |  Synthetic test drawing (not a real project)",
        fontsize=9,
    )
    ax.set_xlim(-1.5, 14.5)
    ax.set_ylim(-3.0, 16.5)
    save(fig, "S102")

    long_m = long_bars * length  # closed loop, no end-cover deduction
    n_trans = round(length / spacing)  # 180, the loop does not double-count the start
    trans_len = width - 2 * cover
    trans_m = n_trans * trans_len
    q = {
        "strip_concrete_m3": length * width * thick,
        "strip_side_formwork_m2": 2 * length * thick,
        "blinding_m3": length * (width + 2 * blind_proj) * blind_thk,
        "excavation_m3": length * (width + 2 * working) * depth,
        "longitudinal_T12_m": long_m,
        "longitudinal_T12_kg": long_m * t12,
        "transverse_T10_m": trans_m,
        "transverse_T10_kg": trans_m * t10,
        "total_concrete_C25_m3": length * width * thick,
        "total_rebar_kg": long_m * t12 + trans_m * t10,
        "transverse_bar_count": n_trans,
        "transverse_bar_length_m": trans_len,
    }
    return {k: round(v, 3) if isinstance(v, float) else v for k, v in q.items()}


def draw_a101():
    """One room. Wall centreline, openings, plaster, tiles, screed, and skirting are stated."""
    internal_l = 5.0
    internal_w = 4.0
    wall_t = 0.20
    # Centreline = internal + one wall thickness.
    cl_l = internal_l + wall_t
    cl_w = internal_w + wall_t
    centreline = 2 * (cl_l + cl_w)  # 18.8 m
    height = 3.0
    door_w, door_h = 0.90, 2.10
    win_w, win_h = 1.20, 1.20
    plaster_sides = 2
    screed = 0.050

    fig, ax = plt.subplots(figsize=(16.5, 11.7))
    ax.set_aspect("equal")
    ax.axis("off")
    # Outer face and inner face.
    ax.add_patch(Rectangle((-wall_t, -wall_t), internal_l + 2 * wall_t, internal_w + 2 * wall_t, fill=False, lw=2.0))
    ax.add_patch(Rectangle((0, 0), internal_l, internal_w, fill=False, lw=1.2))
    # Door on the bottom wall, window on the right wall.
    ax.add_patch(Rectangle((1.6, -wall_t), door_w, wall_t, fc="white", ec="black", lw=1.0))
    ax.text(1.6 + door_w / 2, -wall_t - 0.28, "D1", ha="center", fontsize=10)
    ax.add_patch(Rectangle((internal_l, 1.4), wall_t, win_w, fc="white", ec="black", lw=1.0))
    ax.text(internal_l + wall_t + 0.15, 1.4 + win_w / 2, "W1", va="center", fontsize=10)
    ax.text(
        internal_l / 2,
        internal_w / 2,
        "ROOM R1\ninternal 5000 x 4000\nfloor tiles",
        ha="center",
        va="center",
        fontsize=12,
    )
    dim_h(ax, 0, 5, -1.15, "5000")
    dim_v(ax, 0, 4, -1.15, "4000")
    notes = (
        "WALL AND FINISH SCHEDULE\n"
        "WALL W1  block 200 mm thk, height 3000, centreline 18800 mm (1 no.)\n"
        "OPENING D1  900 x 2100 (1 no.) deduct wall and plaster\n"
        "OPENING W1  1200 x 1200 (1 no.) deduct wall and plaster\n"
        "PLASTER both sides, openings deducted, reveals not measured\n"
        "FLOOR internal 5000 x 4000 tiles\n"
        "SCREED 50 mm under tiles\n"
        "SKIRTING internal perimeter, deduct door 900 mm\n"
        "\n"
        "NOTES\n"
        "1. All dimensions in mm.\n"
        "2. Centreline 18800 mm = 2 x ((5000 + 200) + (4000 + 200)).\n"
        "3. Blockwork is measured net of openings. No wastage is shown.\n"
        "4. Plaster is both faces, openings deducted, reveals not measured.\n"
        "5. Floor tiles and screed are the internal room area.\n"
        "6. Skirting is the internal perimeter with the door width deducted.\n"
        "   The window is not deducted from the skirting."
    )
    ax.text(
        6.3,
        5.4,
        notes,
        va="top",
        fontsize=11,
        family="DejaVu Sans",
        bbox=dict(boxstyle="square", fc="white", ec="black", pad=0.5),
    )
    ax.text(
        -1.3,
        -1.9,
        "SAMPLE DRAWING A-101  |  FLOOR PLAN  |  Scale NTS  |  Synthetic test drawing (not a real project)",
        fontsize=9,
    )
    ax.set_xlim(-2.0, 16.5)
    ax.set_ylim(-2.6, 6.2)
    save(fig, "A101")

    gross = centreline * height
    openings = door_w * door_h + win_w * win_h
    net = gross - openings
    internal_perim = 2 * (internal_l + internal_w)
    q = {
        "wall_gross_m2": gross,
        "openings_m2": openings,
        "wall_net_m2": net,
        "blockwork_m3": net * wall_t,
        "plaster_m2": plaster_sides * net,
        "floor_tiles_m2": internal_l * internal_w,
        "screed_m3": internal_l * internal_w * screed,
        "skirting_m": internal_perim - door_w,
    }
    return {k: round(v, 3) if isinstance(v, float) else v for k, v in q.items()}


def draw_s201():
    """Imperial foundation plan.

    The schedule states the same measurable facts as the Clinton County
    maintenance-building hand measure: 120 ft x 40 ft out-to-out, an 8 in
    concrete wall, a 6 in slab inside the walls, and a CF24 footing with
    three continuous #5 bars and no laps. This sheet is original. It is not
    a copy of that drawing.
    """
    fig, ax = plt.subplots(figsize=(16.5, 11.7))
    ax.set_aspect("equal")
    ax.axis("off")
    ax.add_patch(Rectangle((0, 0), 12.0, 4.0, fill=False, lw=2.0))
    ax.add_patch(Rectangle((0.15, 0.15), 11.7, 3.7, fill=False, lw=1.0))
    ax.text(6.0, 2.0, "SLAB ON GRADE\ninside the 8 in walls\nCF24 at the perimeter", ha="center", va="center", fontsize=12)
    dim_h(ax, 0, 12, -0.7, "120 ft 0 in out-to-out")
    dim_v(ax, 0, 4, 12.6, "40 ft 0 in")
    notes = (
        "SAMPLE DRAWING S-201\n"
        "FOUNDATION PLAN\n"
        "\n"
        "CONTINUOUS FOOTING SCHEDULE (4000 PSI)\n"
        "CF24 2 ft 0 in wide x 1 ft 0 in thick centreline 317 ft 4 in closed (1 no.) LONG (3) #5\n"
        "\n"
        "WALL FW1 concrete 8 in thk, height 5 ft 8 in, centreline 129 ft 10 in (1 no.)\n"
        "WALL FW1 concrete 8 in thk, height 4 ft 4 in, centreline 187 ft 6 in (1 no.)\n"
        "\n"
        "6 in THK CONCRETE SLAB-ON-GRADE inside 118 ft 8 in x 38 ft 8 in (4000 PSI)\n"
        "REINFORCE SLAB WITH 6x6 W2.1xW2.1 WWF CTRD IN THE SLAB\n"
        "\n"
        "NOTES\n"
        "1. All dimensions in feet and inches.\n"
        "2. No laps or hooks. No wastage is shown on this drawing.\n"
        "3. Steel unit mass: #5 = 1.043 lb/ft.\n"
        "4. Out-to-out building 120 ft 0 in x 40 ft 0 in with 8 in walls.\n"
        "5. The slab is the inside area and is on grade. No soffit formwork.\n"
        "6. Wall heights run from the top of the footing up to the top of the wall.\n"
        "\n"
        "Synthetic test drawing, not a real project."
    )
    ax.text(
        -0.2,
        6.6,
        notes,
        va="top",
        fontsize=11,
        family="DejaVu Sans",
        bbox=dict(boxstyle="square", fc="white", ec="black", pad=0.45),
    )
    ax.set_xlim(-0.8, 16.5)
    ax.set_ylim(-1.6, 11.2)
    save(fig, "S201")

    def mm(ft, inches=0):
        return (ft * 12 + inches) * 25.4

    slab = mm(118, 8) * mm(38, 8) * mm(0, 6) / 1e9
    footing = mm(317, 4) * mm(2, 0) * mm(1, 0) / 1e9
    wall = mm(129, 10) * mm(0, 8) * mm(5, 8) / 1e9 + mm(187, 6) * mm(0, 8) * mm(4, 4) / 1e9
    kg_per_m = 1.043 * 0.45359237 / 0.3048
    rebar = 3 * (mm(317, 4) / 1000) * kg_per_m
    area = mm(118, 8) * mm(38, 8) / 1e6

    def r3(value):
        return round(value + 1e-12, 3)

    return {
        "slab_on_grade_m3": r3(slab),
        "slab_wwf_m2": r3(area),
        "strip_concrete_m3": r3(footing),
        "wall_concrete_m3": r3(wall),
        "longitudinal_#5_kg": r3(rebar),
        "total_concrete_4000PSI_m3": r3(r3(slab) + r3(footing) + r3(wall)),
        "total_rebar_kg": r3(rebar),
    }


def main():
    truth = {"S101": draw_s101(), "S102": draw_s102(), "A101": draw_a101(), "S201": draw_s201()}
    path = OUT / "truth.json"
    path.write_text(json.dumps(truth, indent=2) + "\n")
    print(json.dumps(truth, indent=2))


if __name__ == "__main__":
    main()
