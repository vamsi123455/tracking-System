# Highway Vehicle Tracking & Safety System (ITS Prototype)

A professional, runnable, end-to-end Intelligent Transportation System (ITS) demonstration prototype designed to visualize nearby participating highway vehicles, detect speed-limit violations, distinguish opposite-direction traffic, and provide illustrative collision-risk warnings.

---

## 1. Executive Summary & Capabilities

The system supports four distinct vehicle categories:
- 🚗 **Cars & Passenger Vehicles**
- 🏍️ **Bikes & Motorcycles**
- 🚛 **Heavy Freight Trucks**
- 🚌 **Intercity & Transit Buses**

### Core Demonstrated Features
1. **Target Radar Radius (100-Meter Horizon)**: Configurable target detection range with visual radar radius overlays.
2. **Speed-Limit Violation Engine**:
   - 🟢 **Green markers**: Speeds within the applicable configured speed limit (e.g., 80 km/h).
   - 🔴 **Red markers**: Speeds exceeding the speed limit + threshold tolerance.
   - ⚪ **Grey markers**: Stale telemetry (>5s packet silence) or unknown speed.
3. **Opposite-Direction Detection**: Mathematical angular difference ($\Delta\theta \ge 135^\circ$) classifying oncoming or wrong-way highway participants.
4. **Collision Warning Engine (Illustrative)**: Calculates closing velocity and estimated Time-to-Collision (TTC). Fires visual alert banners and audible synthesized chimes via Web Audio API.
5. **GPS & Kinematic Acquisition**: Gathers device GNSS latitude, longitude, speed, and heading via browser Geolocation. When stationary or unsupported, gracefully indicates *Unavailable* rather than fabricating false GPS numbers.
6. **7 Deterministic Scenarios**:
   - `1. Normal Highway Flow`
   - `2. Speed Limit Violation`
   - `3. Opposite-Direction Traffic`
   - `4. Potential Collision Risk`
   - `5. Stale / Lost Telemetry`
   - `6. Mixed Multi-Category Traffic`
   - `7. Offline / Disconnected Mode`
7. **Offline Functionality & Storage**: Local storage caching of settings and recent telemetry events with JSON and CSV audit trail export.

---

## 2. System Architecture

```
+-----------------------------------------------------------------------------------+
|                        HIGHWAY VEHICLE TRACKING & SAFETY SYSTEM                   |
+-----------------------------------------------------------------------------------+
                                          |
        +---------------------------------+--------------------------------+
        |                                                                  |
        v                                                                  v
[1. KINEMATIC SENSING]                                          [2. V2X NETWORKING]
- GNSS / GPS Receiver (Host)                                     - C-V2X (3GPP Rel 14/15 PC5)
- Speed (m/s -> km/h validation)                                 - DSRC (IEEE 802.11p) Sidelink
- Heading (0-359° vector angle)                                  - Local WebSockets / Fast API
- Timestamp & Age validation                                     - BSM / CAM Packet Parsing
        |                                                                  |
        +---------------------------------+--------------------------------+
                                          |
                                          v
                    [3. VEHICLE CORRIDOR ENGINE]
                    - 100-Meter Target Radius Filtering (Haversine)
                    - Vehicle Categorization: Cars | Bikes | Trucks | Buses
                    - Speed Limit Comparator (Road Limit: e.g. 80 km/h)
                    - Opposite-Direction Classifier (180° Δθ threshold)
                                          |
                                          v
                    [4. ILLUSTRATIVE COLLISION RISK ENGINE]
                    - Closing Speed Vector Decomposition (Los velocity)
                    - Time-to-Collision (TTC = d / v_closing)
                    - Risk Classification: CRITICAL (<3.5s) | CAUTION (<6s)
                                          |
                                          v
                    [5. CLIENT DASHBOARD & ALERT ACTUATION]
                    - Color-coded Markers: GREEN (Compliant) | RED (Violation) | GREY (Stale)
                    - Web Audio API Chime & Visual Warning Banners
                    - Offline Storage & IndexedDB Fallback State
```

---

## 3. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Leaflet (OpenStreetMap Dark Matter tiles), Lucide Icons, Web Audio API.
- **Backend**: Python 3.10+, FastAPI, Pydantic v2, SQLite (`sqlite3`), Uvicorn.
- **Testing**: Python `unittest` / `pytest` test suite covering all safety rules.

---

## 4. Windows Installation & Startup Guide

Follow these exact steps in **PowerShell** or **Command Prompt** on Windows:

### Prerequisites
- Node.js (v18 or higher): `node --version`
- Python (v3.10 or higher): `python --version`
- Git (optional)

### Step 1: Clone or Extract the Project
```powershell
cd highway-safety-demo
```

### Step 2: Install Frontend Dependencies
```powershell
npm install
```

### Step 3: Run the Frontend (Vite)
```powershell
npm run dev
```
Open **`http://localhost:3000`** in Google Chrome or Microsoft Edge.

### Step 4: Setup and Run the Python FastAPI Backend (Optional Dual Stack)
Open a second PowerShell window in the project root:
```powershell
# Create Python virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r backend/requirements.txt

# Run the FastAPI server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger API docs will be accessible at: `http://localhost:8000/docs`

---

## 5. Running the Automated Test Suite

Run the 22 automated unit tests validating speed violations, stale data, direction detection, and collision risk:

```powershell
# Using Python standard library unittest:
python -m unittest backend/tests/test_safety_engine.py -v

# Or using pytest (if installed in venv):
pytest backend/tests -v
```

### Verified Test Matrix (All 22 Passed)
- `test_speed_below_limit`: Pass
- `test_speed_equal_to_limit`: Pass
- `test_speed_within_tolerance_threshold`: Pass
- `test_speed_above_limit_violation`: Pass
- `test_speed_excessive_violation`: Pass
- `test_missing_speed`: Pass
- `test_missing_speed_limit`: Pass
- `test_stale_data_speed_status`: Pass
- `test_same_direction_exact`: Pass
- `test_same_direction_slight_drift`: Pass
- `test_opposite_direction_exact`: Pass
- `test_opposite_direction_slight_drift`: Pass
- `test_cross_traffic`: Pass
- `test_missing_heading`: Pass
- `test_haversine_coincident_points`: Pass
- `test_haversine_known_offset`: Pass
- `test_target_horizon_filter`: Pass
- `test_active_beacon`: Pass
- `test_expired_beacon`: Pass
- `test_safe_headway`: Pass
- `test_critical_rapid_closing_conflict`: Pass
- `test_upsert_and_retrieve_vehicle`: Pass

---

## 6. API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | System health, active scenario ID, and simulator runtime status |
| `GET` | `/api/vehicles` | Returns all participating vehicles with computed distance & status |
| `POST` | `/api/vehicles` | Ingests new V2X CAM/BSM beacon packet |
| `GET` | `/api/vehicles/{id}` | Retrieves deep kinematic telemetry for a specific vehicle |
| `GET` | `/api/scenarios` | Lists the 7 pre-configured ITS demonstration scenarios |
| `POST` | `/api/scenarios/{id}/start` | Triggers a specific highway scenario |
| `POST` | `/api/scenarios/reset` | Resets active scenario to base parameters |

---

## 7. Mathematical Formulations

### 1. Speed Limit Status
$$\text{Status} = \begin{cases} 
\text{UNKNOWN} & \text{if } v = \text{null} \lor V_{\text{limit}} = \text{null} \lor \text{isStale} \\
\text{SPEEDING (RED)} & \text{if } v > (V_{\text{limit}} + \Delta v_{\text{tolerance}}) \\
\text{NORMAL (GREEN)} & \text{otherwise}
\end{cases}$$

### 2. Relative Direction Classification
$$\Delta\theta = |\theta_{\text{host}} - \theta_{\text{target}}| \pmod{360}$$
$$\text{Normalized } \Delta\theta = \min(\Delta\theta, 360 - \Delta\theta)$$
- $\Delta\theta \le 45^\circ \implies \text{SAME DIRECTION}$
- $\Delta\theta \ge 135^\circ \implies \text{OPPOSITE DIRECTION}$
- $45^\circ < \Delta\theta < 135^\circ \implies \text{CROSS TRAFFIC}$

### 3. Closing Speed & Time-to-Collision (TTC)
$$v_{\text{closing}} = v_{\text{host}}\cos(\theta_{\text{host}} - \phi) - v_{\text{target}}\cos(\theta_{\text{target}} - \phi)$$
$$\text{TTC} = \frac{d_{\text{haversine}}}{v_{\text{closing}}}$$
- If $d \le 25\text{m} \land \text{TTC} \le 3.0\text{s} \implies \text{CRITICAL COLLISION RISK}$
- If $d \le 55\text{m} \land \text{TTC} \le 6.0\text{s} \implies \text{CAUTION HAZARD}$

---

## 8. Android & V2X Hardware Roadmap

1. **Current Phase**: React/Vite ITS Simulator with Web Audio API, Leaflet map, and Geolocation API.
2. **Phase 2 (Android Native Client)**:
   - Kotlin + Jetpack Compose application.
   - `FusedLocationProviderClient` with raw 10 Hz NMEA sentence parser for sub-meter GNSS Doppler velocity.
   - Foreground service with notification channel preventing Android OS background killing.
3. **Phase 3 (Automotive V2X Hardware)**:
   - Integration with dedicated 5.9 GHz On-Board Units (OBU) over C-V2X (3GPP Release 14/15 PC5 sidelink) or DSRC (IEEE 802.11p).
   - Zero-infrastructure direct vehicle-to-vehicle peer communication operating independently of cellular networks.

---

## 9. Important Safety Disclaimers

- **SIMULATION & DEMONSTRATION ONLY**: All simulated vehicle positions and warnings are generated for ITS research and demonstration purposes.
- **NO FABRICATED LIVE SPEED**: Browser GPS reports actual hardware values or displays *Unavailable* when stationary.
- **ABSENCE OF WARNING IS NOT PROOF OF SAFETY**: A browser application cannot detect non-connected vehicles without physical radar, camera, or LiDAR sensors.
