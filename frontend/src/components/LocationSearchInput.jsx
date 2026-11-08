import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, X, Loader2 } from "lucide-react";

export default function LocationSearchInput({
  label,
  value,
  displayLabel,
  onChange,
  onSelectCoordinate,
  placeholder = "Search street, landmark, or city...",
}) {
  const [query, setQuery] = useState(displayLabel || value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Sync display label when changed externally (e.g. from map click)
  useEffect(() => {
    setQuery(displayLabel || value || "");
  }, [displayLabel, value]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search to Photon (Free OpenStreetMap Geocoding API)
  useEffect(() => {
    if (!query || query.length < 2 || !isOpen) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // Bias search towards Ranchi region by default (lat: 23.344, lon: 85.31)
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
          query
        )}&lat=23.344&lon=85.31&limit=6`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();

        const items = (data.features || []).map((f) => {
          const props = f.properties || {};
          const coords = f.geometry?.coordinates || [0, 0]; // [lon, lat]
          const title = props.name || props.street || "Location";
          const subtitle = [
            props.street,
            props.district || props.locality,
            props.city,
            props.state,
            props.country,
          ]
            .filter(Boolean)
            .filter((v, idx, arr) => arr.indexOf(v) === idx && v !== title)
            .slice(0, 3)
            .join(", ");

          return {
            id: `${coords[1]}_${coords[0]}_${props.osm_id || Math.random()}`,
            title,
            subtitle,
            lat: coords[1],
            lon: coords[0],
            coordStr: `${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}`,
          };
        });

        setSuggestions(items);
      } catch (err) {
        console.error("Geocoding search error:", err);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const handleSelect = (item) => {
    setQuery(item.title);
    setIsOpen(false);
    if (onSelectCoordinate) {
      onSelectCoordinate({
        coordStr: item.coordStr,
        lat: item.lat,
        lon: item.lon,
        name: item.title,
      });
    }
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    if (onChange) onChange("");
  };

  return (
    <div className="field" ref={dropdownRef} style={{ position: "relative" }}>
      <label style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{label}</span>
        {value && value.includes(",") && (
          <span style={{ fontSize: "0.68rem", color: "var(--emerald-600)" }}>
            📍 {value}
          </span>
        )}
      </label>

      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <Search
          size={14}
          style={{
            position: "absolute",
            left: "10px",
            color: "var(--slate-400)",
            pointerEvents: "none",
          }}
        />
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          style={{ paddingLeft: "30px", paddingRight: "28px" }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (onChange) onChange(e.target.value);
          }}
          onFocus={() => {
            if (query.length >= 2) setIsOpen(true);
          }}
        />

        {loading ? (
          <Loader2
            size={14}
            className="spinner"
            style={{
              position: "absolute",
              right: "8px",
              color: "var(--emerald-600)",
              animation: "spin 1s linear infinite",
            }}
          />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: "absolute",
              right: "6px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px",
              color: "var(--slate-400)",
            }}
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {/* Suggestion Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 1000,
            background: "white",
            border: "1px solid var(--slate-300)",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            margin: "4px 0 0",
            padding: "4px 0",
            listStyle: "none",
            maxHeight: "220px",
            overflowY: "auto",
          }}
        >
          {suggestions.map((item) => (
            <li
              key={item.id}
              onClick={() => handleSelect(item)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                borderBottom: "1px solid var(--slate-100)",
                fontSize: "0.8rem",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--emerald-50)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <MapPin
                size={14}
                style={{
                  color: "var(--emerald-600)",
                  marginTop: "2px",
                  flexShrink: 0,
                }}
              />
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontWeight: 600, color: "var(--slate-800)" }}>
                  {item.title}
                </div>
                {item.subtitle && (
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--slate-500)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.subtitle}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
