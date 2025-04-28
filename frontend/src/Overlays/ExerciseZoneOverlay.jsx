import React, { useState, useEffect, useMemo } from "react";
import "../css/ExerciseZoneOverlay.css";

/**
 * Exercise Zone Overlay: detects when the person's feet enter the central zone,
 * and adds a sun/pulsing effect around the BPM display when inside.
 *
 * Props
 * ─────────────────────────────────────────────────────
 * heartRate        : number | null
 * detection        : { bbox, landmarks } where landmarks are either [x, y] arrays or { x, y } objects, normalized (0–1)
 * targetWidth      : number
 * targetHeight     : number
 * onEnter / onLeave: fn
 */
export default function ExerciseZoneOverlay({
  heartRate,
  detection,
  targetWidth = 0,
  targetHeight = 0,
  onEnter,
  onLeave,
}) {
  // Track zone state
  const [inside, setInside] = useState(false);

  // Heart-rate zone styling
  const zoneMeta = useMemo(() => {
    const hr = heartRate ?? -1;
    const zones = [
      { name: "blue",   min: 0,   max: 50,  side: "top",    rgb: "0,162,255" },
      { name: "green",  min: 51,  max: 110, side: "right",  rgb: "0,200,0"   },
      { name: "yellow", min: 111, max: 150, side: "bottom", rgb: "255,193,7" },
      { name: "red",    min: 151, max: 180, side: "left",   rgb: "255,0,0"   },
    ];
    if (hr >= 181) return { name: "purple", side: "all", rgb: "153,0,255" };
    const found = zones.find((z) => hr >= z.min && hr <= z.max);
    return found ?? { name: null, side: null, rgb: "128,128,128" };
  }, [heartRate]);

  // Compute foot midpoint from last two landmarks
  const footPoint = useMemo(() => {
    // Ensure detection and landmarks exist
    const lm = detection?.landmarks;
    if (!lm || lm.length < 2) return null;

    // Helper function to handle different landmark formats [x, y] or {x, y}
    const toXY = (p) => {
      if (Array.isArray(p)) return { x: p[0], y: p[1] };
      if (p && typeof p === 'object' && 'x' in p && 'y' in p) return { x: p.x, y: p.y };
      return null;
    };

    // Get the last two landmarks, assuming they represent feet
    const a = toXY(lm[lm.length - 2]);
    const b = toXY(lm[lm.length - 1]);

    // If points are invalid, return null
    if (!a || !b) return null;

    // Calculate midpoint and scale to target dimensions
    return {
      x: ((a.x + b.x) / 2) * targetWidth,
      y: ((a.y + b.y) / 2) * targetHeight,
    };
  }, [detection?.landmarks, targetWidth, targetHeight]); // Dependency includes optional chaining access


  // Detect entry/exit of feet into central region
  useEffect(() => {
    // Only proceed if footPoint is calculated and target dimensions are valid
    if (!footPoint || targetWidth <= 0 || targetHeight <= 0) return;

    // Define the central zone boundaries (central 50% area)
    const marginX = targetWidth * 0.25;
    const marginY = targetHeight * 0.25;

    // Check if the footPoint is within the central zone
    const nowInside =
      footPoint.x >= marginX && footPoint.x <= targetWidth - marginX &&
      footPoint.y >= marginY && footPoint.y <= targetHeight - marginY;

    // If the inside state changes, update state and call callbacks
    if (nowInside !== inside) {
      setInside(nowInside);
      if (nowInside) {
        onEnter?.(); // Call onEnter if provided
      } else {
        onLeave?.(); // Call onLeave if provided
      }
    }
  }, [footPoint, targetWidth, targetHeight, inside, onEnter, onLeave]);

  const sides = ["top", "right", "bottom", "left"];

  return (
    <div className="exercise-zone-overlay">
      <div
        className={`zone-square ${inside ? "inside" : ""}`}
        style={{
          // Apply a subtle background color based on the heart rate zone
          backgroundColor: zoneMeta.name
            ? `rgba(${zoneMeta.rgb},0.1)` // Reduced opacity slightly
            : "transparent",
          // Apply scaling and shadow effect when inside the zone
          transform: inside ? "scale(1.03)" : "scale(1)", // Slightly reduced scale
          boxShadow: inside
            ? `0 0 20px rgba(${zoneMeta.rgb},0.6)` // Adjusted shadow
            : "none",
          transition: "transform 0.4s ease-out, box-shadow 0.4s ease-out, background-color 0.4s linear", // Smoother transitions
        }}
      >
        {/* Render the colored side indicators */}
        {sides.map((side) => (
          <div
            key={side}
            className={[
              "zone-side",
              side,
              `clr-${side}`, // Base color class
              (zoneMeta.side === side || zoneMeta.side === "all") // Check if this side should be active
                ? `active ${zoneMeta.name === "purple" ? "purple" : ""}` // Add active/purple classes
                : "",
            ]
              .filter(Boolean) // Remove empty strings
              .join(" ")} // Join classes with space
          />
        ))}

        {/* ===== NEW: Sun effect conditionally rendered behind BPM ===== */}
        {inside && <div className="sun-effect" />}

        {/* BPM Display */}
        {/* No 'pulse' class needed here anymore, effect handled by sun-effect */}
        <div className="bpm-display">
          {heartRate ?? "--"} {/* Display heart rate or '--' */}
          <span className="units"> BPM</span>
        </div>
      </div>
    </div>
  );
}