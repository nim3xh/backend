# Backend Directory Structure

This document outlines the directory structure for the Technest Account Manager API.

## 📁 Main Directories

### `/dll`
Contains downloadable DLL files and executables.
- Place `indicator.zip` here for the PropTraderPro download endpoint

**Endpoint:** `GET /download/proptraderpro`

---

### `/products`
Contains product ZIP files organized by product name. Each product has its own folder with the same name as the ZIP file inside.

**Structure:**
```
products/
├── Prop Trade Planner - Dr.Markets/
│   └── Prop Trade Planner - Dr.Markets.zip
├── TradeRx/
│   └── TradeRx.zip
├── JournalX/
│   └── JournalX.zip
├── TradeCam/
│   └── TradeCam.zip
├── Trade Video Recorder/
│   └── Trade Video Recorder.zip
├── Regular Updates/
│   └── Regular Updates.zip
├── White-Glove Prop Trading Environment Setup/
│   └── White-Glove Prop Trading Environment Setup.zip
├── Custom Strategy Development (Advisory)/
│   └── Custom Strategy Development (Advisory).zip
├── One-on-one Prop Firm Journey Coaching/
│   └── One-on-one Prop Firm Journey Coaching.zip
├── Prop Trade Planner Dr.Markets Trial/
│   └── Prop Trade Planner Dr.Markets Trial.zip
├── TradeRx - Trial/
│   └── TradeRx - Trial.zip
├── JournalX Trial/
│   └── JournalX Trial.zip
├── TradeCam Trial/
│   └── TradeCam Trial.zip
├── Trade Video Recorder Trial/
│   └── Trade Video Recorder Trial.zip
├── Core Bundle Trial — Planner + TradeRx + JournalX/
│   └── Core Bundle Trial — Planner + TradeRx + JournalX.zip
└── Core Bundle — Planner + TradeRx + JournalX/
    └── Core Bundle — Planner + TradeRx + JournalX.zip
```

**Endpoint:** `GET /download/:productName`

**Example:** `GET /download/TradeRx` will download `TradeRx.zip`

---

### `/dashboards`
Contains dashboard data organized by account number (apex ID). Each account has its own folder containing trade CSV files.

**Structure:**
```
dashboards/
├── test/
│   └── test.txt (for alert-hook testing)
├── 123456/
│   ├── 123456_Trades.csv
│   └── other_files...
└── 789012/
    ├── 789012_Trades.csv
    └── other_files...
```

**Endpoints:**
- `GET /file-creation-time` - Lists all files with creation times
- `GET /download/trades/:accountNumber` - Downloads the _Trades.csv file for a specific account
- `POST /alert-hook` - Appends data to `dashboards/test/test.txt`

---

### `/events`
Contains event data in CSV format.

**Required File:**
- `2025-events.csv` - Contains columns: Date, Event Name, Start Time (EST), Duration

**Structure:**
```
Date,Event Name,Start Time (EST),Duration
2025-11-16,FOMC Meeting,2:00 PM,30 minutes
2025-12-25,Christmas,All Day,Holiday
```

**Endpoint:** `GET /events/by-date?date=YYYY-MM-DD`

---

### `/holidays`
Contains holiday data in CSV format.

**Required File:**
- `holidays.csv` - Contains columns: Observed Date, Holiday Name

**Structure:**
```
Observed Date,Holiday Name
12/25/2025,Christmas Day
1/1/2025,New Year's Day
7/4/2025,Independence Day
```

**Endpoint:** `GET /is-holiday?date=YYYY-MM-DD`

---

### `/samplefiles`
Contains sample CSV files that can be downloaded.

**Endpoint:** `GET /samplefiles/:filename`

**Example:** `GET /samplefiles/example.csv`

**Security:** Only allows CSV files with safe filenames (alphanumeric, hyphens, dots)

---

## 📄 Root Files

### `upload_sample.csv`
Sample CSV file for dashboard data template.

**Endpoint:** `GET /download/demo` - Downloads as `dashboard_data_sample.csv`

---

## 🔐 Security Notes

1. **Product Downloads**: Product names must match exactly (case-insensitive)
2. **Sample Files**: Only CSV files with safe filenames are allowed
3. **Account Access**: Account numbers are used as folder names for organization
4. **File Validation**: All file operations include existence checks and error handling

---

## 📝 Setup Checklist

- [x] Create `/dll` directory
- [x] Create `/products` directory with all 16 product subdirectories
- [x] Create `/dashboards` directory with test folder
- [x] Create `/events` directory
- [x] Create `/holidays` directory
- [x] Create `/samplefiles` directory
- [ ] Add `indicator.zip` to `/dll` folder
- [ ] Add product ZIP files to respective `/products` subdirectories
- [ ] Add `2025-events.csv` to `/events` folder
- [ ] Add `holidays.csv` to `/holidays` folder
- [ ] Add `upload_sample.csv` to root directory
- [ ] Add sample CSV files to `/samplefiles` folder

---

## 🚀 Quick Start

1. Place your files in the appropriate directories according to the structure above
2. Make sure each product ZIP file is named exactly like its parent folder
3. Run `npm run dev` to start the server with auto-restart
4. Test endpoints using the URLs documented above

---

## 📞 API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/download/proptraderpro` | GET | Download indicator.zip |
| `/download/:productName` | GET | Download product by name |
| `/download/demo` | GET | Download sample CSV |
| `/download/trades/:accountNumber` | GET | Download account trades CSV |
| `/samplefiles/:filename` | GET | Download sample file |
| `/file-creation-time` | GET | List all dashboard files |
| `/events/by-date` | GET | Get events by date |
| `/is-holiday` | GET | Check if date is holiday |
| `/current-time` | GET | Get current PST time |
| `/alert-hook` | POST | Test webhook endpoint |

---

**Last Updated:** November 17, 2025
