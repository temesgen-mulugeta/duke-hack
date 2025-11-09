import React, { useState, useEffect, useRef } from "react";
import {
  Excalidraw,
  convertToExcalidrawElements,
  exportToBlob,
  exportToSvg,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/excalidraw/types";
import type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
} from "@excalidraw/excalidraw/types/excalidraw/element/types";
import {
  convertMermaidToExcalidraw,
  DEFAULT_MERMAID_CONFIG,
} from "./utils/mermaidConverter";
import type { MermaidConfig } from "@excalidraw/mermaid-to-excalidraw";

// Type definitions
type ExcalidrawAPIRefValue = ExcalidrawImperativeAPI;

interface ServerElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  roughness?: number;
  opacity?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string | number;
  label?: {
    text: string;
  };
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  syncedAt?: string;
  source?: string;
  syncTimestamp?: string;
  boundElements?: any[] | null;
  containerId?: string | null;
  locked?: boolean;
}

interface WebSocketMessage {
  type: string;
  element?: ServerElement;
  elements?: ServerElement[];
  elementId?: string;
  count?: number;
  timestamp?: string;
  source?: string;
  mermaidDiagram?: string;
  config?: MermaidConfig;
}

interface ApiResponse {
  success: boolean;
  elements?: ServerElement[];
  element?: ServerElement;
  count?: number;
  error?: string;
  message?: string;
}

type SyncStatus = "idle" | "syncing" | "success" | "error";

// Helper function to clean elements for Excalidraw
const cleanElementForExcalidraw = (
  element: ServerElement
): Partial<ExcalidrawElement> => {
  const {
    createdAt,
    updatedAt,
    version,
    syncedAt,
    source,
    syncTimestamp,
    ...cleanElement
  } = element;
  return cleanElement;
};

// Helper function to validate and fix element binding data
const validateAndFixBindings = (
  elements: Partial<ExcalidrawElement>[]
): Partial<ExcalidrawElement>[] => {
  const elementMap = new Map(elements.map((el) => [el.id!, el]));

  return elements.map((element) => {
    const fixedElement = { ...element };

    // Validate and fix boundElements
    if (fixedElement.boundElements) {
      if (Array.isArray(fixedElement.boundElements)) {
        fixedElement.boundElements = fixedElement.boundElements.filter(
          (binding: any) => {
            // Ensure binding has required properties
            if (!binding || typeof binding !== "object") return false;
            if (!binding.id || !binding.type) return false;

            // Ensure the referenced element exists
            const referencedElement = elementMap.get(binding.id);
            if (!referencedElement) return false;

            // Validate binding type
            if (!["text", "arrow"].includes(binding.type)) return false;

            return true;
          }
        );

        // Remove boundElements if empty
        if (fixedElement.boundElements.length === 0) {
          fixedElement.boundElements = null;
        }
      } else {
        // Invalid boundElements format, set to null
        fixedElement.boundElements = null;
      }
    }

    // Validate and fix containerId
    if (fixedElement.containerId) {
      const containerElement = elementMap.get(fixedElement.containerId);
      if (!containerElement) {
        // Container doesn't exist, remove containerId
        fixedElement.containerId = null;
      }
    }

    return fixedElement;
  });
};

function App(): JSX.Element {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawAPIRefValue | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const websocketRef = useRef<WebSocket | null>(null);

  // Sync state management
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Track last elements to detect changes
  const lastElementsRef = useRef<readonly NonDeletedExcalidrawElement[]>([]);
  const changeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track if we're currently applying updates from WebSocket (LLM-initiated)
  const isApplyingRemoteUpdateRef = useRef<boolean>(false);
  const remoteUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket connection
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  // Load existing elements when Excalidraw API becomes available
  useEffect(() => {
    if (excalidrawAPI) {
      loadExistingElements();

      // Ensure WebSocket is connected for real-time updates
      if (!isConnected) {
        connectWebSocket();
      }
    }
  }, [excalidrawAPI, isConnected]);

  const loadExistingElements = async (): Promise<void> => {
    try {
      const response = await fetch("/api/elements");
      const result: ApiResponse = await response.json();

      if (result.success && result.elements && result.elements.length > 0) {
        const cleanedElements = result.elements.map(cleanElementForExcalidraw);
        const convertedElements = convertToExcalidrawElements(cleanedElements, {
          regenerateIds: false,
        });
        excalidrawAPI?.updateScene({ elements: convertedElements });
      }
    } catch (error) {
      console.error("Error loading existing elements:", error);
    }
  };

  const connectWebSocket = (): void => {
    if (
      websocketRef.current &&
      websocketRef.current.readyState === WebSocket.OPEN
    ) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;

    websocketRef.current = new WebSocket(wsUrl);

    websocketRef.current.onopen = () => {
      setIsConnected(true);

      if (excalidrawAPI) {
        setTimeout(loadExistingElements, 100);
      }
    };

    websocketRef.current.onmessage = (event: MessageEvent) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error, event.data);
      }
    };

    websocketRef.current.onclose = (event: CloseEvent) => {
      setIsConnected(false);

      // Reconnect after 3 seconds if not a clean close
      if (event.code !== 1000) {
        setTimeout(connectWebSocket, 3000);
      }
    };

    websocketRef.current.onerror = (error: Event) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };
  };

  const handleWebSocketMessage = async (
    data: WebSocketMessage
  ): Promise<void> => {
    if (!excalidrawAPI) {
      return;
    }

    try {
      const currentElements = excalidrawAPI.getSceneElements();
      console.log("Current elements:", currentElements);

      // Mark that we're applying a remote update (from LLM/WebSocket)
      // This prevents onChange from treating LLM changes as user changes
      const shouldMarkAsRemote = [
        "initial_elements",
        "element_created",
        "element_updated",
        "element_deleted",
        "elements_batch_created",
        "mermaid_convert",
      ].includes(data.type);

      if (shouldMarkAsRemote) {
        isApplyingRemoteUpdateRef.current = true;

        // Clear any existing timeout
        if (remoteUpdateTimeoutRef.current) {
          clearTimeout(remoteUpdateTimeoutRef.current);
        }

        // Reset the flag after a short delay to allow Excalidraw to process the update
        remoteUpdateTimeoutRef.current = setTimeout(() => {
          isApplyingRemoteUpdateRef.current = false;
          console.log(
            "🔄 Remote update complete, user changes will now be tracked"
          );
        }, 500);
      }

      switch (data.type) {
        case "initial_elements":
          if (data.elements && data.elements.length > 0) {
            const cleanedElements = data.elements.map(
              cleanElementForExcalidraw
            );
            const validatedElements = validateAndFixBindings(cleanedElements);
            const convertedElements =
              convertToExcalidrawElements(validatedElements);
            excalidrawAPI.updateScene({
              elements: convertedElements,
            });
          }
          break;

        case "element_created":
          if (data.element) {
            const cleanedNewElement = cleanElementForExcalidraw(data.element);
            const newElement = convertToExcalidrawElements([cleanedNewElement]);
            const updatedElementsAfterCreate = [
              ...currentElements,
              ...newElement,
            ];
            excalidrawAPI.updateScene({
              elements: updatedElementsAfterCreate,
            });
          }
          break;

        case "element_updated":
          if (data.element) {
            const cleanedUpdatedElement = cleanElementForExcalidraw(
              data.element
            );
            const convertedUpdatedElement = convertToExcalidrawElements([
              cleanedUpdatedElement,
            ])[0];
            const updatedElements = currentElements.map((el) =>
              el.id === data.element!.id ? convertedUpdatedElement : el
            );
            excalidrawAPI.updateScene({
              elements: updatedElements,
            });
          }
          break;

        case "element_deleted":
          if (data.elementId) {
            const filteredElements = currentElements.filter(
              (el) => el.id !== data.elementId
            );
            excalidrawAPI.updateScene({
              elements: filteredElements,
            });
          }
          break;

        case "elements_batch_created":
          if (data.elements) {
            const cleanedBatchElements = data.elements.map(
              cleanElementForExcalidraw
            );
            const batchElements =
              convertToExcalidrawElements(cleanedBatchElements);
            const updatedElementsAfterBatch = [
              ...currentElements,
              ...batchElements,
            ];
            excalidrawAPI.updateScene({
              elements: updatedElementsAfterBatch,
            });
          }
          break;

        case "elements_synced":
          console.log(`Sync confirmed by server: ${data.count} elements`);
          // Sync confirmation already handled by HTTP response
          break;

        case "sync_status":
          console.log(`Server sync status: ${data.count} elements`);
          break;

        case "elements_cleared":
          console.log("Received clear all elements from server");
          // Mark as remote update to prevent onChange notification
          isApplyingRemoteUpdateRef.current = true;
          excalidrawAPI.updateScene({
            elements: [],
          });
          // Reset the flag after clearing
          if (remoteUpdateTimeoutRef.current) {
            clearTimeout(remoteUpdateTimeoutRef.current);
          }
          remoteUpdateTimeoutRef.current = setTimeout(() => {
            isApplyingRemoteUpdateRef.current = false;
            console.log("🔄 Canvas cleared by server, user changes will now be tracked");
          }, 500);
          break;

        case "mermaid_convert":
          console.log("Received Mermaid conversion request from MCP");
          if (data.mermaidDiagram) {
            try {
              const result = await convertMermaidToExcalidraw(
                data.mermaidDiagram,
                data.config || DEFAULT_MERMAID_CONFIG
              );

              if (result.error) {
                console.error("Mermaid conversion error:", result.error);
                return;
              }

              if (result.elements && result.elements.length > 0) {
                const convertedElements = convertToExcalidrawElements(
                  result.elements as any,
                  { regenerateIds: false }
                );
                excalidrawAPI.updateScene({
                  elements: convertedElements,
                });

                if (result.files) {
                  excalidrawAPI.addFiles(Object.values(result.files));
                }

                console.log(
                  "Mermaid diagram converted successfully:",
                  result.elements.length,
                  "elements"
                );

                // Sync to backend automatically after creating elements
                await syncToBackend();
              }
            } catch (error) {
              console.error(
                "Error converting Mermaid diagram from WebSocket:",
                error
              );
            }
          }
          break;

        case "screenshot_request":
          console.log(
            "Received screenshot request from MCP:",
            (data as any).requestId
          );
          await handleScreenshotRequest(data);
          break;

        default:
          console.log("Unknown WebSocket message type:", data.type);
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error, data);
    }
  };

  // Data format conversion for backend
  const convertToBackendFormat = (
    element: ExcalidrawElement
  ): ServerElement => {
    return {
      ...element,
    } as ServerElement;
  };

  // Detect and describe canvas changes for LLM
  const describeCanvasChanges = (
    currentElements: readonly NonDeletedExcalidrawElement[],
    previousElements: readonly NonDeletedExcalidrawElement[]
  ): string | null => {
    const prevMap = new Map(previousElements.map((el) => [el.id, el]));
    const currMap = new Map(currentElements.map((el) => [el.id, el]));

    const added = currentElements.filter((el) => !prevMap.has(el.id));
    const removed = previousElements.filter((el) => !currMap.has(el.id));
    const modified = currentElements.filter((el) => {
      const prev = prevMap.get(el.id);
      return prev && prev.version !== el.version;
    });

    // Build description
    const changes: string[] = [];

    if (added.length > 0) {
      const types = added.map((el) => el.type).join(", ");
      changes.push(`Added ${added.length} element(s): ${types}`);
    }

    if (removed.length > 0) {
      changes.push(`Removed ${removed.length} element(s)`);
    }

    if (modified.length > 0) {
      changes.push(`Modified ${modified.length} element(s)`);
    }

    if (changes.length === 0) return null;

    return `User made changes to canvas: ${changes.join("; ")}`;
  };

  // Send canvas update to LLM (Option A: postMessage for iframe)
  const sendCanvasUpdateViaPostMessage = (
    description: string,
    elements: readonly NonDeletedExcalidrawElement[]
  ) => {
    // Send to parent window (Next.js client containing the iframe)
    if (window.parent && window.parent !== window) {
      const message = {
        type: "canvas_update",
        description,
        elementCount: elements.length,
        elements: elements.map(convertToBackendFormat),
        timestamp: new Date().toISOString(),
      };
      window.parent.postMessage(message, "*"); // In production, specify origin
      console.log("📤 Sent canvas update via postMessage:", description);
    }
  };

  // Send canvas update to LLM (Option B: WebSocket via Express server)
  const sendCanvasUpdateViaWebSocket = (
    description: string,
    elements: readonly NonDeletedExcalidrawElement[]
  ) => {
    if (
      websocketRef.current &&
      websocketRef.current.readyState === WebSocket.OPEN
    ) {
      const message = {
        type: "canvas_user_update",
        description,
        elementCount: elements.length,
        elements: elements.map(convertToBackendFormat),
        timestamp: new Date().toISOString(),
      };
      websocketRef.current.send(JSON.stringify(message));
      console.log("📤 Sent canvas update via WebSocket:", description);
    }
  };

  // Handle screenshot request from MCP
  const handleScreenshotRequest = async (data: any) => {
    if (!excalidrawAPI) {
      console.error("Excalidraw API not available for screenshot");
      sendScreenshotResponse(
        data.requestId,
        false,
        null,
        "Excalidraw API not available"
      );
      return;
    }

    try {
      const { requestId, format = "png", quality = 1 } = data;
      console.log(`📸 Capturing screenshot: ${requestId}`, { format, quality });

      let screenshotData: string;

      if (format === "svg") {
        // Export as SVG using the exportToSvg utility
        const svg = await exportToSvg({
          elements: excalidrawAPI.getSceneElements() as any,
          appState: excalidrawAPI.getAppState(),
          files: excalidrawAPI.getFiles(),
        });

        // Convert SVG to string
        const svgString = new XMLSerializer().serializeToString(svg);
        screenshotData = btoa(unescape(encodeURIComponent(svgString))); // Base64 encode
      } else {
        // Export as PNG (blob) using the exportToBlob utility
        const blob = await exportToBlob({
          elements: excalidrawAPI.getSceneElements() as any,
          appState: excalidrawAPI.getAppState(),
          files: excalidrawAPI.getFiles(),
          mimeType: "image/png",
        });

        // Convert blob to base64
        screenshotData = await blobToBase64(blob);
      }

      console.log(`✅ Screenshot captured successfully: ${requestId}`);
      sendScreenshotResponse(requestId, true, screenshotData, null, format);
    } catch (error) {
      console.error("Error capturing screenshot:", error);
      sendScreenshotResponse(
        data.requestId,
        false,
        null,
        (error as Error).message
      );
    }
  };

  // Send screenshot response via WebSocket
  const sendScreenshotResponse = (
    requestId: string,
    success: boolean,
    data: string | null,
    error: string | null,
    format?: string
  ) => {
    if (
      websocketRef.current &&
      websocketRef.current.readyState === WebSocket.OPEN
    ) {
      const message = {
        type: "screenshot_response",
        requestId,
        success,
        data,
        error,
        format,
        timestamp: new Date().toISOString(),
      };
      websocketRef.current.send(JSON.stringify(message));
      console.log("📤 Sent screenshot response:", requestId);
    }
  };

  // Helper function to convert Blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(",")[1]; // Remove data:image/png;base64, prefix
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Handle canvas changes from user
  const handleCanvasChange = (
    elements: readonly NonDeletedExcalidrawElement[]
  ) => {
    // IGNORE changes that are from LLM/WebSocket updates
    if (isApplyingRemoteUpdateRef.current) {
      console.log(
        "⏭️ Ignoring onChange - this is an LLM update, not a user change"
      );
      // Still update the reference so we don't send stale diffs later
      lastElementsRef.current = elements;
      return;
    }

    // Clear existing timeout
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }

    // Debounce: wait 2 seconds after last change before sending
    changeTimeoutRef.current = setTimeout(() => {
      // Double-check we're not in a remote update when the timeout fires
      if (isApplyingRemoteUpdateRef.current) {
        console.log("⏭️ Timeout fired during remote update, skipping");
        lastElementsRef.current = elements;
        return;
      }

      const description = describeCanvasChanges(
        elements,
        lastElementsRef.current
      );

      if (description) {
        console.log("👤 User-initiated change detected:", description);
        // Send via BOTH methods - postMessage for iframe, WebSocket for fallback
        sendCanvasUpdateViaPostMessage(description, elements);
        sendCanvasUpdateViaWebSocket(description, elements);
      }

      // Update reference
      lastElementsRef.current = elements;
    }, 2000);
  };

  // Format sync time display
  const formatSyncTime = (time: Date | null): string => {
    if (!time) return "";
    return time.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Main sync function
  const syncToBackend = async (): Promise<void> => {
    if (!excalidrawAPI) {
      console.warn("Excalidraw API not available");
      return;
    }

    setSyncStatus("syncing");

    try {
      // 1. Get current elements
      const currentElements = excalidrawAPI.getSceneElements();
      console.log(`Syncing ${currentElements.length} elements to backend`);

      // Filter out deleted elements
      const activeElements = currentElements.filter((el) => !el.isDeleted);

      // 3. Convert to backend format
      const backendElements = activeElements.map(convertToBackendFormat);

      // 4. Send to backend
      const response = await fetch("/api/elements/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          elements: backendElements,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const result: ApiResponse = await response.json();
        setSyncStatus("success");
        setLastSyncTime(new Date());
        console.log(`Sync successful: ${result.count} elements synced`);

        // Reset status after 2 seconds
        setTimeout(() => setSyncStatus("idle"), 2000);
      } else {
        const error: ApiResponse = await response.json();
        setSyncStatus("error");
        console.error("Sync failed:", error.error);
      }
    } catch (error) {
      setSyncStatus("error");
      console.error("Sync error:", error);
    }
  };

  const clearCanvas = async (): Promise<void> => {
    if (excalidrawAPI) {
      try {
        // Mark as remote update so onChange doesn't send "User removed all elements" to LLM
        isApplyingRemoteUpdateRef.current = true;

        // Get all current elements and delete them from backend
        const response = await fetch("/api/elements");
        const result: ApiResponse = await response.json();

        if (result.success && result.elements) {
          const deletePromises = result.elements.map((element) =>
            fetch(`/api/elements/${element.id}`, { method: "DELETE" })
          );
          await Promise.all(deletePromises);
        }

        // Clear the frontend canvas
        excalidrawAPI.updateScene({
          elements: [],
        });

        // Reset the flag after clearing
        if (remoteUpdateTimeoutRef.current) {
          clearTimeout(remoteUpdateTimeoutRef.current);
        }
        remoteUpdateTimeoutRef.current = setTimeout(() => {
          isApplyingRemoteUpdateRef.current = false;
          console.log("🔄 Canvas cleared, user changes will now be tracked");
        }, 500);
      } catch (error) {
        console.error("Error clearing canvas:", error);
        // Still clear frontend even if backend fails
        isApplyingRemoteUpdateRef.current = true;
        excalidrawAPI.updateScene({
          elements: [],
        });

        if (remoteUpdateTimeoutRef.current) {
          clearTimeout(remoteUpdateTimeoutRef.current);
        }
        remoteUpdateTimeoutRef.current = setTimeout(() => {
          isApplyingRemoteUpdateRef.current = false;
        }, 500);
      }
    }
  };

  return (
    <div className="app">
      {/* Header */}
      {/* <div className="header">
        <h1>Excalidraw Canvas</h1>
        <div className="controls">
          <div className="status">
            <div
              className={`status-dot ${
                isConnected ? "status-connected" : "status-disconnected"
              }`}
            ></div>
            <span>{isConnected ? "Connected" : "Disconnected"}</span>
          </div> */}

          {/* Sync Controls */}
          {/* <div className="sync-controls">
            <button
              className={`btn-primary ${
                syncStatus === "syncing" ? "btn-loading" : ""
              }`}
              onClick={syncToBackend}
              disabled={syncStatus === "syncing" || !excalidrawAPI}
            >
              {syncStatus === "syncing" && <span className="spinner"></span>}
              {syncStatus === "syncing" ? "Syncing..." : "Sync to Backend"}
            </button> */}

            {/* Sync Status */}
            {/* <div className="sync-status">
              {syncStatus === "success" && (
                <span className="sync-success">✅ Synced</span>
              )}
              {syncStatus === "error" && (
                <span className="sync-error">❌ Sync Failed</span>
              )}
              {lastSyncTime && syncStatus === "idle" && (
                <span className="sync-time">
                  Last sync: {formatSyncTime(lastSyncTime)}
                </span>
              )}
            </div>
          </div>

          <button className="btn-secondary" onClick={clearCanvas}>
            Clear Canvas
          </button>
        </div>
      </div> */}

      {/* Canvas Container */}
      <div className="canvas-container">
        <Excalidraw
          excalidrawAPI={(api: ExcalidrawAPIRefValue) => setExcalidrawAPI(api)}
          onChange={(elements) => {
            // Only track non-deleted elements for LLM updates
            const activeElements = elements.filter(
              (el) => !el.isDeleted
            ) as readonly NonDeletedExcalidrawElement[];
            handleCanvasChange(activeElements);
          }}
          initialData={{
            elements: [],
            appState: {
              theme: "light",
              viewBackgroundColor: "#ffffff",
            },
          }}
        />
      </div>
    </div>
  );
}

export default App;
