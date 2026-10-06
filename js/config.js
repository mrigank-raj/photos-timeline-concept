// All tunable numbers live here, nowhere else.

// Library
export const SEED = 20261007;
export const LIBRARY_START = Date.UTC(2023, 0, 1);
export const TODAY = Date.UTC(2026, 8, 30);
export const BRUNO_FROM = Date.UTC(2025, 5, 1);   // Bruno appears from mid 2025
export const ORDINARY_DAY_CHANCE = 1 / 3;
export const ORDINARY_PHOTOS_MIN = 1;
export const ORDINARY_PHOTOS_MAX = 5;
export const SCREENSHOT_COUNT = 150;
export const FORWARD_COUNT = 100;
export const BURST_COUNT = 40;
export const BURST_SIZE_MIN = 3;
export const BURST_SIZE_MAX = 6;

// Timeline
export const LAPTOP_MIN_WIDTH = 768;      // 6 columns at or above this width, 4 below
export const GRID_GAP = 2;                // px between tiles
export const DAY_HEADER_HEIGHT = 44;      // px
export const RENDER_BUFFER_SCREENS = 1;   // rows rendered above and below the viewport, in screen heights
export const TILE_MAX_DPR = 2;            // tile canvas resolution cap
export const BACK_PILL_MS = 5000;
export const SWIPE_MIN_PX = 50;           // viewer swipe distance
export const SCRUBBER_HANDLE_HEIGHT = 48; // px
export const PREWARM_BATCH = 24;          // tiles drawn per worker message when pre-drawing the whole library in the background
export const FALLBACK_SLICE_MS = 12;       // no-OffscreenCanvas fallback: max main-thread drawing per frame
export const PREWARM_PAUSE_MS = 250;      // pause pre-drawing while the user scrolled within this time
export const PREWARM_NEAR = 400;          // v2: background drawing starts within this many tiles (or covers) of the screen

// Moments (Version B)
export const MOMENT_MAX_GAP_HOURS = 30;          // travel places: a longer gap starts a new moment
export const MOMENT_PEOPLE_JACCARD_MIN = 0.2;    // people overlap below this starts a new moment...
export const MOMENT_JACCARD_MIN_GAP_HOURS = 3;   // ...but only after a gap longer than this
export const MOMENT_COVER_SCALE = 1.3;           // moment cover size relative to a grid tile
export const MOMENT_ROW_GAP = 8;                 // px between moment rows

// Speed switch (Version B). Velocity is measured over real elapsed time, not frames.
export const VELOCITY_WINDOW_MS = 150;
export const COLLAPSE_VELOCITY = 2500;           // px/s, touch and scrubber: above this, show moments
export const EXPAND_VELOCITY = 600;              // px/s, touch and scrubber: below this for EXPAND_HOLD_MS, back to grid
export const COLLAPSE_VELOCITY_WHEEL = 2000;     // px/s, mouse wheel / trackpad (initial values, tune on a laptop)
export const EXPAND_VELOCITY_WHEEL = 500;
export const EXPAND_HOLD_MS = 400;
export const SETTLE_MS = 200;                    // scroll idle time before the layout offset is reset (see timeline.js)

// Faces (Version B)
export const MAX_FACES = 2;                      // a third tap replaces the oldest selection
export const TICK_MERGE_PX = 6;                  // ticks closer than this merge into one
export const TICK_TAP_HEIGHT = 40;               // px, invisible tap area of a tick
export const DIM_OPACITY = 0.35;                 // photos/moments without the selected people

// "Same people, other times" strip (Version B)
export const STRIP_IDLE_MS = 600;                // scroll idle time before the strip appears
export const STRIP_VIEWPORT_POINT = 0.4;         // the strip is for the moment 40% down the screen
export const STRIP_WEIGHT_PEOPLE = 0.6;          // score = 0.6 x Jaccard(people) + 0.4 x Jaccard(scene tags)
export const STRIP_WEIGHT_SCENE = 0.4;
export const STRIP_PEOPLE_JACCARD_MIN = 0.5;
export const STRIP_EXCLUDE_DAYS = 30;            // moments this close in time are not suggested
export const STRIP_MAX_OTHERS = 3;

// Test flow and logging
export const PREVIEW_MS = 5000;                  // target photo shown before each task
export const TASK_TIMEOUT_MS = 120000;
export const PICK_DEBOUNCE_MS = 1000;            // repeat "This is it" taps within this are ignored
export const LOW_EFFORT_GIVEUP_MS = 5000;        // "Can't find it" this early = lowEffort
export const LOW_EFFORT_WRONG_PICKS = 5;         // ...or this many wrong picks...
export const LOW_EFFORT_WINDOW_MS = 20000;       // ...within this window
export const VIEWER_MESSAGE_MS = 2500;

// MVP v2
export const VIEWER_RESERVED_PX = 330;          // viewer height kept for the date, people and similar moments below the photo
export const TOAST_MS = 5000;                   // "Removed ... from this photo" with Undo
export const NUDGE_AFTER_SWIPES = 3;            // swipes within one moment before "Same people, other times" is highlighted
