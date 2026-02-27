# Million Row Virtual Grid

A high-performance, fully client-side virtualized data grid that renders **1,000,000** financial transactions with smooth scrolling, sorting, filtering, selection, editing, and column pinning. The app is containerized with Docker and served via Nginx.

## Features

- Manual virtual scrolling (no react-window / tanstack-virtual)
- 1,000,000-row dataset generated via script
- Fixed-height rows with sizer + translateY windowing
- Sorting on all columns (click to toggle asc/desc/none)
- Merchant text filter with debounce
- Quick status filters (Completed, Pending)
- Single row selection and Ctrl/Cmd multi-selection
- Inline cell editing for merchant column
- Pinning (sticky) for `id` and `date` columns
- Floating debug panel with FPS, rendered row count, and scroll position
- Docker + Nginx setup with healthcheck, exposed on port 8080

## Tech Stack

- React 18
- Webpack + Babel
- Vanilla CSS (inline styles)
- Node.js data generation script
- Docker + Nginx

## Getting Started (Local Dev)

1. Install dependencies:

```bash
npm install

Generate the 1,000,000-row dataset:

npm run generate-data

This creates public/transactions.json containing 1,000,000 transaction objects:

{
  "id": "number",
  "date": "string (ISO 8601)",
  "merchant": "string",
  "category": "string",
  "amount": "number",
  "status": "string (Completed | Pending | Failed)",
  "description": "string"
}


Start the development server:

npm run start

Open:

http://localhost:3000

You should see the virtualized financial grid and a floating debug panel.


(When you paste this part into README, ensure the nested code blocks are kept; many editors will handle this fine.)

***

### Part 4 – Docker / Production

```md
## Docker / Production

The app is containerized and served by Nginx.

### Build and run

```bash
docker-compose build
docker-compose up -d


The frontend service builds the React app, runs npm run generate-data, bundles to dist, and serves via Nginx.

Healthcheck: Docker Compose checks http://localhost inside the container.

Access the app on:

http://localhost:8080

Check container status:
The frontend service builds the React app, runs npm run generate-data, bundles to dist, and serves via Nginx.

Healthcheck: Docker Compose checks http://localhost inside the container.

Access the app on:

http://localhost:8080

Check container status:
docker ps
The frontend container should eventually show healthy in the STATUS column.

***

### Part 5 – Virtualization Approach

```md
## Virtualization Approach

The grid implements manual virtualization (windowing) with these core ideas:

1. **Fixed row height**

All rows use a constant height (e.g., 40px). This allows us to compute indices directly from scroll position:

- `rowIndex = Math.floor(scrollTop / rowHeight)`

2. **Scroll container + sizer**

- The main viewport is a scrollable div:

  - `data-test-id="grid-scroll-container"`
  - `height: 80vh`, `overflow: auto`

- Inside it, a **sizer** div has `height = totalRows * rowHeight`. This creates a natural scrollbar as if all 1,000,000 rows were rendered.

3. **Window element with translateY**

- A child div:

  - `data-test-id="grid-row-window"`
  - `position: absolute`, `transform: translateY(offsetY)`

- On scroll, we compute:

  - `startIndex` and `endIndex` based on scrollTop and viewport height.
  - Only the visible slice (plus a buffer) is rendered.
  - `offsetY = startIndex * rowHeight`.

4. **Visible window slice**

We render only a small subset of rows:

- Typically fewer than 100 DOM nodes at any scroll position.
- The dataset remains in memory (`rows`), but the DOM remains small and constant.

This ensures smooth scrolling and avoids DOM bloat.


## Sorting

- Sorting is applied to the in-memory dataset after filtering.
- Sort state is tracked as `{ key, direction }`.
- Clicking a column header cycles:

  - `NONE → ASC → DESC → NONE`

- For the `amount` column:

  - Header has `data-test-id="header-amount"`.
  - Uses numeric comparison for numbers and string comparison otherwise.

## Filtering

### Merchant text filter

- Input: `data-test-id="filter-merchant"`
- Debounced with 300ms using `useEffect` + `setTimeout`.
- Case-insensitive substring match on `row.merchant`.
- Filter applies to the full 1,000,000-row dataset in memory.

### Status quick filters

- Buttons:

  - `data-test-id="quick-filter-Completed"`
  - `data-test-id="quick-filter-Pending"`

- Clicking a button restricts the dataset to that status.
- A clear button resets the status filter.

### Filter count

- Label: `data-test-id="filter-count"`
- Shows: `Showing X of 1,000,000 rows`, where `X` is the count after all filters.

## Selection

- Each row div:

  - Has `data-test-id="virtual-row-<id>"`.
  - Has `data-selected="true"` when selected, otherwise `false`.

### Single selection

- Clicking a row selects it and clears all other selections.

### Multi selection (Ctrl/Cmd)

- Holding Ctrl (Windows/Linux) or Cmd (macOS) while clicking toggles that row’s selection.
- Multiple rows can have `data-selected="true"`.

## Cell Editing

- Merchant cell of the first visible row has:

  - `data-test-id="cell-0-merchant"`

- Behavior:

  - Double-click enters edit mode by rendering an `<input>`.
  - Editing is tracked via local state.
  - On blur or Enter:

    - The cell exits edit mode.
    - Underlying data in `rows` is updated.
  - Escape cancels editing.

## Column Pinning

- Pinning state for `id` and `date` columns is controlled by buttons:

  - `data-test-id="pin-column-id"`
  - `data-test-id="pin-column-date"`

- When pinned:

  - Header `data-test-id="header-id"` / `header-date` receives the `pinned-column` class.
  - All visible `id` / `date` cells also get `pinned-column` (and `pinned-column date` for date).
  - `pinned-column` uses `position: sticky` and `left` offsets to keep the columns visible during horizontal scrolling.

## Debug Panel

A floating debug overlay shows real-time metrics:

- Container: `data-test-id="debug-panel"`
- FPS: `data-test-id="debug-fps"`
- Rendered rows: `data-test-id="debug-rendered-rows"`
- Scroll position: `data-test-id="debug-scroll-position"`

FPS is computed using `requestAnimationFrame` and a rolling window. Scroll position shows approximately `Row <firstVisibleIndex> / 1000000`.

## Testing Hooks (data-test-id)

The application exposes all required `data-test-id` attributes for automated testing:

- Grid:

  - `grid-scroll-container`
  - `grid-row-window`
  - `virtual-row-<id>`

- Debug:

  - `debug-panel`
  - `debug-fps`
  - `debug-rendered-rows`
  - `debug-scroll-position`

- Sorting:

  - `header-id`, `header-date`, `header-merchant`, `header-category`,
    `header-amount`, `header-status`, `header-description`

- Filtering:

  - `filter-merchant`
  - `filter-count`
  - `quick-filter-Completed`
  - `quick-filter-Pending`

- Selection:

  - `data-selected="true"` on selected rows

- Editing:

  - `cell-0-merchant`

- Pinning:

  - `pin-column-id`
  - `pin-column-date`
  - `pinned-column` CSS class on headers and cells

## Environment Variables

See `.env.example`. Currently, no required environment variables are used; the file is provided for completeness and future configuration.


