"use client";
import { useState, useCallback, useEffect } from "react";

// Accuracy above this threshold (meters) is treated as "approximate" location —
// likely the OS gave network/IP location instead of GPS.
const PRECISION_THRESHOLD_M = 150;

export type LocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "imprecise"
  | "denied"
  | "unavailable"
  | "timeout";

export type LocationState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "granted"; lat: number; lng: number; accuracy: number }
  | { status: "imprecise"; lat: number; lng: number; accuracy: number }
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "timeout" };

export function useLocation() {
  const [state, setState] = useState<LocationState>({ status: "idle" });

  const request = useCallback(() => {
    if (!navigator?.geolocation) {
      setState({ status: "unavailable" });
      return;
    }

    setState({ status: "requesting" });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        if (accuracy > PRECISION_THRESHOLD_M) {
          setState({ status: "imprecise", lat, lng, accuracy: Math.round(accuracy) });
        } else {
          setState({ status: "granted", lat, lng, accuracy: Math.round(accuracy) });
        }
      },
      (err) => {
        if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
          setState({ status: "denied" });
        } else if (err.code === GeolocationPositionError.TIMEOUT) {
          setState({ status: "timeout" });
        } else {
          setState({ status: "unavailable" });
        }
      },
      {
        enableHighAccuracy: true, // triggers GPS hardware + precise-location prompt on iOS
        timeout: 15000,
        maximumAge: 0,           // never use cached position — always get a fresh fix
      },
    );
  }, []);

  // Auto-request on mount
  useEffect(() => {
    // Check existing permission state first so we don't re-prompt if already granted
    if (typeof navigator === "undefined") return;
    if (!navigator.geolocation) { setState({ status: "unavailable" }); return; }

    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          if (result.state === "denied") {
            setState({ status: "denied" });
          } else {
            // "granted" or "prompt" — ask for the position
            request();
          }
          // Re-run if the user changes permission in Settings while on the page
          result.onchange = () => {
            if (result.state === "denied") setState({ status: "denied" });
            else request();
          };
        })
        .catch(() => request()); // Permissions API not supported — just ask
    } else {
      request();
    }
  }, [request]);

  const isReady = state.status === "granted";
  const coords =
    state.status === "granted" || state.status === "imprecise"
      ? { lat: state.lat, lng: state.lng }
      : null;

  return { state, request, isReady, coords };
}
