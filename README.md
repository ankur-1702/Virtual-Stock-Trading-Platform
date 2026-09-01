# Kagaz Markets — Virtual Stock Trading Platform

**Tech Stack:** React, JavaScript, Recharts, Lucide React, CSS

## Overview

Kagaz Markets is a browser-based paper-trading platform that allows users to practice buying and selling stocks using virtual money against a simulated market. The application runs entirely on the client side, with no login, backend, database, or live market API required.

## Key Features

* **Virtual Trading:** Start with ₹10,00,000 in virtual cash and buy or sell stocks without real financial risk.
* **Simulated Market:** Includes 10 companies across sectors such as IT, FMCG, Auto, Energy, Pharma, Banking, Metals, Aviation, and Media.
* **Time-Travel Trading:** Select any available trading day and 30-minute time slot to view historical prices and execute trades at that exact market tick.
* **Portfolio Management:** Tracks holdings, quantities, and weighted average cost for each stock.
* **Profit & Loss Tracking:** Displays both realized P&L from completed trades and unrealized P&L from current holdings.
* **Transaction History:** Maintains a detailed record of trades, including timestamp, stock, order type, quantity, price, total value, and realized P&L.
* **Price Charts:** Visualizes historical stock prices using Recharts.
* **Responsive UI:** Custom paper-ledger inspired interface built with plain CSS.

## Market Data

The application generates deterministic test market data in memory using a seeded random-walk algorithm.

| Parameter             | Details                      |
| --------------------- | ---------------------------- |
| Stocks                | 10                           |
| Trading Days          | 13 weekdays                  |
| Trading Hours         | 09:15–15:15 IST              |
| Interval              | Every 30 minutes             |
| Ticks per Day         | 13                           |
| Total Price Points    | 1,690                        |
| Starting Virtual Cash | ₹10,00,000                   |
| Data Source           | Seeded simulated market data |

Each stock has its own base price, drift, and volatility, allowing different stocks and sectors to exhibit different price behaviors.

## Core Functionality

### 1. Market Generation

generateMarket() creates the trading calendar and generates a deterministic price series for every stock using a seeded random-walk model.

### 2. Time-Based Pricing

The selected dayIdx and timeIdx determine the current simulated market time. All components—including market prices, charts, trade execution, and portfolio valuation—use the same selected tick to maintain consistency.

### 3. Buying Stocks

When a user purchases shares:

* The selected stock's current simulated price is used.
* Virtual cash is reduced by the trade value.
* The holding quantity is updated.
* Weighted average cost is recalculated.

### 4. Selling Stocks

When shares are sold:

* The current simulated price is used.
* The holding quantity is reduced.
* Realized P&L is calculated using:

`(Sell Price − Average Cost) × Quantity`

* The realized P&L is added to the overall realized P&L.

### 5. Portfolio Valuation

The portfolio's net worth is calculated as:

`Net Worth = Available Cash + Current Value of Holdings`

Total P&L is calculated as:

`Total P&L = Net Worth − Starting Cash`

## Architecture

The project intentionally uses a simple client-side architecture.

```text
React Application
│
├── Market Data Generator
│   └── generateMarket()
│
├── Simulation Clock
│   ├── Trading Day
│   └── Time Slot
│
├── Trading Engine
│   ├── Buy
│   └── Sell
│
├── Portfolio Manager
│   ├── Holdings
│   ├── Average Cost
│   └── Portfolio Value
│
├── P&L Calculator
│   ├── Realized P&L
│   └── Unrealized P&L
│
└── UI
    ├── Market Grid
    ├── Trade Interface
    ├── Price Charts
    ├── Portfolio
    └── Transaction History
```

## React Concepts Used

* Functional components
* `useState` for application and trading state
* `useMemo` for derived calculations
* `useCallback` for optimized event handlers
* Component-based UI design
* Client-side state management

## Project Structure

```text
kagaz-markets/
├── src/
│   ├── App.jsx
│   └── kagaz-trading-platform.jsx
├── README.md
└── package.json
```

The core application is intentionally contained in a single React component file, making it easy to integrate into an existing React project or run as a standalone artifact.

## Running the Project

Create a React application using Vite:

```bash
npm create vite@latest kagaz-markets -- --template react
cd kagaz-markets
npm install recharts lucide-react
```

Copy `kagaz-trading-platform.jsx` into `src/` and render it from `App.jsx`:

```jsx
import KagazTradingPlatform from "./kagaz-trading-platform";

export default function App() {
  return <KagazTradingPlatform />;
}
```

Run the application:

```bash
npm run dev
```

## Data Architecture

The application currently generates market data in memory instead of using physical CSV files or a database.

For example:

```text
Stock
├── Symbol
├── Name
├── Sector
└── Points
    ├── Trading Day
    ├── Time
    └── Price
```

The application can also be extended to support real CSV files with the following structure:

```csv
symbol,date,time,price
NEXUS,2026-08-19,09:15,1421.30
NEXUS,2026-08-19,09:45,1423.85
```

A CSV parser such as PapaParse can be used to load external market data while maintaining the same data structure expected by the UI.

## Current Limitations

* Trading state resets when the page is refreshed.
* No user authentication or account management.
* Single predefined user.
* No backend or database.
* Trades execute immediately at the selected simulated price.
* No limit orders or partial fills.
* No simulated market-closed state.

## Future Enhancements

* Persistent portfolio and transaction data
* User authentication and multiple portfolios
* Watchlists and price alerts
* Limit orders and order cancellation
* Runtime CSV import
* Portfolio performance and net-worth charts
* Simulated market-hours enforcement
* Backend/database integration

## Impact

Kagaz Markets demonstrates practical experience in building a complete interactive application—from deterministic data generation and state management to trade execution, financial calculations, visualization, and a custom user interface—without relying on a backend or live financial APIs.
