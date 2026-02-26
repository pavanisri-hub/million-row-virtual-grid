import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo
} from "react";

const ROW_HEIGHT = 40; // px
const BUFFER_ROWS = 10;

const SORT_DIRECTIONS = {
  ASC: "asc",
  DESC: "desc",
  NONE: "none"
};

function VirtualizedGrid() {
  const [rows, setRows] = useState([]);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [scrollTop, setScrollTop] = useState(0);

  // sort state
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: SORT_DIRECTIONS.NONE
  });

  // filter state
  const [merchantFilterInput, setMerchantFilterInput] = useState("");
  const [merchantFilter, setMerchantFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState(null); // "Completed" | "Pending" | null

  // selection state (track ids)
  const [selectedIds, setSelectedIds] = useState(new Set());

  // editing state
  const [editingCell, setEditingCell] = useState(null); // { rowId, columnKey } | null
  const [editingValue, setEditingValue] = useState("");

  const scrollContainerRef = useRef(null);

  // Debug state
  const [fps, setFps] = useState(0);
  const [renderedCount, setRenderedCount] = useState(0);
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);

  const lastFrameTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const fpsLastUpdateRef = useRef(performance.now());

  // Load data
  useEffect(() => {
    async function loadData() {
      const res = await fetch("/transactions.json", {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      });
      const data = await res.json();
      setRows(data);
    }
    loadData();
  }, []);

  // Measure viewport height
  useEffect(() => {
    if (scrollContainerRef.current) {
      setViewportHeight(scrollContainerRef.current.clientHeight);
    }
  }, []);

  // Scroll handler
  const onScroll = useCallback((e) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
  }, []);

  // Debounce merchant filter input
  useEffect(() => {
    const handler = setTimeout(() => {
      setMerchantFilter(merchantFilterInput.trim().toLowerCase());
    }, 300);

    return () => clearTimeout(handler);
  }, [merchantFilterInput]);

  // Apply filtering to full dataset
  const filteredRows = useMemo(() => {
    if (!rows || rows.length === 0) return rows;

    let result = rows;

    if (merchantFilter) {
      result = result.filter((row) =>
        String(row.merchant).toLowerCase().includes(merchantFilter)
      );
    }

    if (statusFilter) {
      result = result.filter((row) => row.status === statusFilter);
    }

    return result;
  }, [rows, merchantFilter, statusFilter]);

  // Apply sorting to filtered dataset
  const sortedRows = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return filteredRows;
    if (!sortConfig.key || sortConfig.direction === SORT_DIRECTIONS.NONE) {
      return filteredRows;
    }

    const sorted = [...filteredRows].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return -1;
      if (bVal == null) return 1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return aVal - bVal;
      }

      return String(aVal).localeCompare(String(bVal));
    });

    if (sortConfig.direction === SORT_DIRECTIONS.DESC) {
      sorted.reverse();
    }
    return sorted;
  }, [filteredRows, sortConfig]);

  const totalRows = sortedRows.length;
  const totalHeight = totalRows * ROW_HEIGHT;

  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS
  );
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + BUFFER_ROWS * 2;
  const endIndex = Math.min(totalRows, startIndex + visibleCount);

  const offsetY = startIndex * ROW_HEIGHT;
  const visibleRows = sortedRows.slice(startIndex, endIndex);

  // Update debug info
  useEffect(() => {
    setRenderedCount(visibleRows.length);
    setCurrentRowIndex(startIndex);
    setFilteredCount(filteredRows.length);
  }, [visibleRows.length, startIndex, filteredRows.length]);

  // FPS calculation using requestAnimationFrame
  useEffect(() => {
    let animationFrameId;

    const loop = (now) => {
      frameCountRef.current += 1;

      const timeSinceLastUpdate = now - fpsLastUpdateRef.current;
      if (timeSinceLastUpdate >= 500) {
        const currentFps =
          (frameCountRef.current * 1000) / timeSinceLastUpdate;
        setFps(Math.round(currentFps));
        fpsLastUpdateRef.current = now;
        frameCountRef.current = 0;
      }

      lastFrameTimeRef.current = now;
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Click handlers for sort headers
  const toggleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) {
        return { key, direction: SORT_DIRECTIONS.ASC };
      }
      if (prev.direction === SORT_DIRECTIONS.ASC) {
        return { key, direction: SORT_DIRECTIONS.DESC };
      }
      if (prev.direction === SORT_DIRECTIONS.DESC) {
        return { key: null, direction: SORT_DIRECTIONS.NONE };
      }
      return { key, direction: SORT_DIRECTIONS.ASC };
    });
  };

  const sortIndicator = (key) => {
    if (sortConfig.key !== key) return "";
    if (sortConfig.direction === SORT_DIRECTIONS.ASC) return " ▲";
    if (sortConfig.direction === SORT_DIRECTIONS.DESC) return " ▼";
    return "";
  };

  const handleQuickFilterStatus = (status) => {
    setStatusFilter(status);
  };

  const clearStatusFilter = () => {
    setStatusFilter(null);
  };

  // Selection handlers
  const handleRowClick = (event, rowId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (event.ctrlKey || event.metaKey) {
        if (next.has(rowId)) {
          next.delete(rowId);
        } else {
          next.add(rowId);
        }
      } else {
        next.clear();
        next.add(rowId);
      }
      return next;
    });
  };

  const isRowSelected = (rowId) => selectedIds.has(rowId);

  // Editing handlers (merchant column)
  const startEditingCell = (rowId, columnKey, initialValue) => {
    setEditingCell({ rowId, columnKey });
    setEditingValue(initialValue);
  };

  const commitEditingCell = () => {
    if (!editingCell) return;
    const { rowId, columnKey } = editingCell;
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === rowId ? { ...row, [columnKey]: editingValue } : row
      )
    );
    setEditingCell(null);
    setEditingValue("");
  };

  const cancelEditingCell = () => {
    setEditingCell(null);
    setEditingValue("");
  };

  const handleEditingKeyDown = (e) => {
    if (e.key === "Enter") {
      commitEditingCell();
    } else if (e.key === "Escape") {
      cancelEditingCell();
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Debug Panel */}
      <div
        data-test-id="debug-panel"
        style={{
          position: "fixed",
          top: "16px",
          right: "16px",
          zIndex: 1000,
          background: "rgba(0,0,0,0.8)",
          color: "#fff",
          padding: "8px 12px",
          borderRadius: "4px",
          fontSize: "12px",
          fontFamily: "monospace"
        }}
      >
        <div data-test-id="debug-fps">FPS: {fps}</div>
        <div data-test-id="debug-rendered-rows">
          Rendered rows: {renderedCount}
        </div>
        <div data-test-id="debug-scroll-position">
          Row {currentRowIndex} / {totalRows || 0}
        </div>
      </div>

      {/* Filter controls */}
      <div style={{ marginBottom: "8px", display: "flex", gap: "8px" }}>
        <input
          type="text"
          data-test-id="filter-merchant"
          placeholder="Filter by merchant"
          value={merchantFilterInput}
          onChange={(e) => setMerchantFilterInput(e.target.value)}
          style={{
            padding: "4px 8px",
            fontSize: "13px",
            flex: "0 0 250px"
          }}
        />
        <div
          data-test-id="filter-count"
          style={{ fontSize: "13px", alignSelf: "center" }}
        >
          Showing {filteredCount} of 1,000,000 rows
        </div>
        <button
          type="button"
          data-test-id="quick-filter-Completed"
          onClick={() => handleQuickFilterStatus("Completed")}
          style={{
            padding: "4px 8px",
            fontSize: "13px",
            cursor: "pointer"
          }}
        >
          Completed
        </button>
        <button
          type="button"
          data-test-id="quick-filter-Pending"
          onClick={() => handleQuickFilterStatus("Pending")}
          style={{
            padding: "4px 8px",
            fontSize: "13px",
            cursor: "pointer"
          }}
        >
          Pending
        </button>
        <button
          type="button"
          onClick={clearStatusFilter}
          style={{
            padding: "4px 8px",
            fontSize: "13px",
            cursor: "pointer"
          }}
        >
          Clear Status
        </button>
      </div>

      {/* Grid */}
      <div
        ref={scrollContainerRef}
        data-test-id="grid-scroll-container"
        style={{
          position: "relative",
          height: "80vh",
          border: "1px solid #ccc",
          overflowY: "auto",
          fontFamily: "sans-serif"
        }}
        onScroll={onScroll}
      >
        {/* Header row */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            background: "#f5f5f5",
            display: "flex",
            borderBottom: "1px solid #ddd",
            fontWeight: "bold",
            fontSize: "13px"
          }}
        >
          <div
            data-test-id="header-id"
            style={{ width: "80px", padding: "0 8px", cursor: "pointer" }}
            onClick={() => toggleSort("id")}
          >
            ID{sortIndicator("id")}
          </div>
          <div
            data-test-id="header-date"
            style={{ width: "180px", padding: "0 8px", cursor: "pointer" }}
            onClick={() => toggleSort("date")}
          >
            Date{sortIndicator("date")}
          </div>
          <div
            data-test-id="header-merchant"
            style={{ width: "160px", padding: "0 8px", cursor: "pointer" }}
            onClick={() => toggleSort("merchant")}
          >
            Merchant{sortIndicator("merchant")}
          </div>
          <div
            data-test-id="header-category"
            style={{ width: "140px", padding: "0 8px", cursor: "pointer" }}
            onClick={() => toggleSort("category")}
          >
            Category{sortIndicator("category")}
          </div>
          <div
            data-test-id="header-amount"
            style={{ width: "120px", padding: "0 8px", cursor: "pointer" }}
            onClick={() => toggleSort("amount")}
          >
            Amount{sortIndicator("amount")}
          </div>
          <div
            data-test-id="header-status"
            style={{ width: "120px", padding: "0 8px", cursor: "pointer" }}
            onClick={() => toggleSort("status")}
          >
            Status{sortIndicator("status")}
          </div>
          <div
            data-test-id="header-description"
            style={{ flex: 1, minWidth: 0, padding: "0 8px", cursor: "pointer" }}
            onClick={() => toggleSort("description")}
          >
            Description{sortIndicator("description")}
          </div>
        </div>

        {/* Sizer + window */}
        <div
          style={{
            height: `${totalHeight}px`,
            position: "relative"
          }}
        >
          <div
            data-test-id="grid-row-window"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${offsetY}px)`
            }}
          >
            {visibleRows.map((row, index) => {
              const rowIndex = startIndex + index;
              const selected = isRowSelected(row.id);
              const isEditingMerchant =
                editingCell &&
                editingCell.rowId === row.id &&
                editingCell.columnKey === "merchant";

              return (
                <div
                  key={row.id}
                  data-test-id={`virtual-row-${row.id}`}
                  data-selected={selected ? "true" : "false"}
                  onClick={(e) => handleRowClick(e, row.id)}
                  style={{
                    height: `${ROW_HEIGHT}px`,
                    display: "flex",
                    alignItems: "center",
                    borderBottom: "1px solid #eee",
                    padding: "0 8px",
                    boxSizing: "border-box",
                    backgroundColor: selected
                      ? "#cce4ff"
                      : rowIndex % 2 === 0
                      ? "#fff"
                      : "#fafafa",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ width: "80px" }}>{row.id}</div>
                  <div style={{ width: "180px" }}>{row.date}</div>
                  <div
                    style={{ width: "160px" }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startEditingCell(row.id, "merchant", row.merchant);
                    }}
                  >
                    {/* For requirement: cell-0-merchant */}
                    {rowIndex === 0 ? (
                      <div data-test-id="cell-0-merchant">
                        {isEditingMerchant ? (
                          <input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={commitEditingCell}
                            onKeyDown={handleEditingKeyDown}
                            style={{ width: "100%" }}
                          />
                        ) : (
                          row.merchant
                        )}
                      </div>
                    ) : isEditingMerchant ? (
                      <input
                        autoFocus
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={commitEditingCell}
                        onKeyDown={handleEditingKeyDown}
                        style={{ width: "100%" }}
                      />
                    ) : (
                      row.merchant
                    )}
                  </div>
                  <div style={{ width: "140px" }}>{row.category}</div>
                  <div style={{ width: "120px" }}>{row.amount}</div>
                  <div style={{ width: "120px" }}>{row.status}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>{row.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VirtualizedGrid;
