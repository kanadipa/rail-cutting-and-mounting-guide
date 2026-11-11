# Data model

Two JSON files in `data/` describe the job:

- **`placement.json`** lists the rails to cut, and under each rail its **placed items**: the
  components that go on it.
- **`catalog.json`** describes each article once: what it is, its picture and its 3D model, and for
  a rail its profile and its raw length.

They are a starting point, **not a schema**. If you use a database, design your own.

Units are **millimetres** everywhere.

```
placement.json                          catalog.json
└─ rail ──────────────── article ──────▶ article
   └─ placedItems[]                        ▲
      └─ item ────────── article ──────────┘
```

An **article** is named by two fields together: `manufacturer` and `articleNumber`, the
manufacturer's own number as printed on the part and its box. Two manufacturers can use the same
number, so neither field is enough on its own.

## `placement.json`: the rails, and what goes on each

```json
[
  {
    "bmk": "-U1",
    "manufacturer": "Weidmueller",
    "articleNumber": "0236500000",
    "cutLengthMm": 306,
    "placedItems": [
      {
        "bmk": "-2K1/1",
        "manufacturer": "Siemens",
        "articleNumber": "6ES7131-6BH01-0BA0",
        "pose": { "positionMm": [155.1, -15.8, 8.63], "quaternion": [0, 0, 0, 1] }
      },
      {
        "bmk": "-2K1/2",
        "manufacturer": "Siemens",
        "articleNumber": "6ES7193-6BP00-0BA0",
        "pose": { "positionMm": [157.7, -58.52, -7.1], "quaternion": [0, 0, 0, 1] }
      }
    ]
  }
]
```

### A rail

| Field | Meaning |
| --- | --- |
| `bmk` | The rail's BMK, and its identifier. |
| `manufacturer`, `articleNumber` | A rail is an article in `catalog.json`. |
| `cutLengthMm` | How long the operator cuts the piece. It is cut from a raw bar whose length is `barLengthMm` in `catalog.json`. |
| `placedItems` | The components that go on this rail, **sorted by BMK**. This is _not_ the mounting order; see below. |

A rail has **no pose**. It is the frame its items are placed in, and `cutRailModel` always returns the piece at the origin.

### A placed item

| Field | Meaning |
| --- | --- |
| `bmk` | The part's BMK, and its identifier. |
| `manufacturer`, `articleNumber` | Which article it is in `catalog.json`. |
| `pose` | Where the 3D model goes, in its rail's frame: `positionMm` is `[x, y, z]`, and `quaternion` is the rotation as `[x, y, z, w]`. |

## The mounting order is yours to work out

The data does not say in which order the parts go on. **Work it out from the poses**, the way the
operator will mount them:

- Parts go on **from left to right** along the rail, so from the lowest X to the highest.
- Some parts occupy **the same stretch of rail**, such as an ET200SP base unit and the I/O module
  that plugs into its front. The part **nearer the rail** (lower Z) goes on first, then the one that
  clips onto it.
- A **marker carrier** clips on top of the parts it labels, so it goes on after them.

Tell us in `DECISIONS.md` how you derived the order.

## `catalog.json`: one entry per article

```json
{
  "manufacturer": "Wago",
  "articleNumber": "2203-7641",
  "displayName": "Multi level installation terminal block",
  "category": "terminal",
  "glb": "assets/glb/Wago.2203-7641.glb",
  "image": "assets/images/Wago.2203-7641.webp"
}
```

A **rail profile** also carries its cross-section and the length of its raw bars:

```json
{
  "manufacturer": "Weidmueller",
  "articleNumber": "0236500000",
  "displayName": "TS 35X15/LL 2M/ST/ZN",
  "category": "rail",
  "profileWxH": "35X15",
  "barLengthMm": 2000,
  "glb": "assets/glb/Weidmueller.0236500000.glb",
  "image": "assets/images/Weidmueller.0236500000.webp"
}
```

| Field | Meaning |
| --- | --- |
| `manufacturer`, `articleNumber` | The article's key: who makes it, and their article number for it. |
| `displayName` | What the article is, as text to show. |
| `category` | A rough type, such as `terminal`, `end_cover`, `end_bracket`, `marker_carrier` or `i_o_base_unit`. |
| `profileWxH` | Rail only. The cross-section, width × height in mm: `35X15` is 35 mm wide and 15 mm deep. |
| `barLengthMm` | Rail only. The length of one raw bar. A piece longer than its bar cannot be cut. |
| `glb` | 3D model. For a component, take it as it is. For a rail, it is the model of a **raw bar**. Cut it to length with `cutRailModel`. |
| `image` | Product picture. |
