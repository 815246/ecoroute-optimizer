/**
 * GooglePlacesInput – Autocomplete address & landmark search input powered by Google Places API.
 */
import React, { useEffect, useRef, useState } from "react";

export default function GooglePlacesInput({
  label,
  placeholder,
  value,
  onSelectPlace,
  disabled,
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [inputValue, setInputValue] = useState(value || "");

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          fields: ["geometry", "formatted_address", "name"],
        }
      );

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place && place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const displayName = place.name || place.formatted_address;
          setInputValue(displayName);
          onSelectPlace({
            name: displayName,
            address: place.formatted_address,
            lat,
            lng,
            coordsStr: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          });
        }
      });

      autocompleteRef.current = autocomplete;
    } catch (err) {
      console.warn("Failed to attach Google Places autocomplete:", err);
    }

    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onSelectPlace]);

  return (
    <div className="field">
      {label && <label>{label}</label>}
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder || "Type a landmark, city, or address..."}
        value={inputValue}
        disabled={disabled}
        onChange={(e) => setInputValue(e.target.value)}
        autoComplete="off"
      />
    </div>
  );
}
